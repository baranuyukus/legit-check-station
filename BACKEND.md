# Meezy Archive — Backend Dokümantasyonu

Bu doküman, projenin backend'ini (PostgreSQL + Auth + Storage + Edge Functions) **sıfırdan kurabilecek** detayda anlatır.
Amaç: ileride projeyi kendi Supabase hesabınızda çalıştırmak istediğinizde bu dosyayı referans (veya doğrudan prompt) olarak kullanmak.

---

## 1. Genel Mimari

| Katman | Teknoloji | Not |
|---|---|---|
| Veritabanı | PostgreSQL (Supabase) | 7 tablo, 1 enum, 5 fonksiyon |
| Kimlik doğrulama | Supabase Auth (email + password) | `auth.users` yönetilir, FK verilebilir ama profil tablosu ayrıdır |
| Depolama | Storage bucket `item-images` (private) | Ürün görselleri, signed URL ile okunur |
| Sunucu mantığı | Deno Edge Functions (6 adet) | Shopify webhook, claim, transfer, tarama logu, admin atama |
| Frontend | React + Vite, `@supabase/supabase-js` | `src/integrations/supabase/client.ts` |

### İş akışı özeti
1. Shopify'da sipariş ödenir → `shopify-order-webhook` tetiklenir → `certificates` kaydı + benzersiz `claim_token` üretilir.
2. Ürünle birlikte QR (`/claim/<claim_token>`) gönderilir.
3. Kullanıcı QR'ı okutur → giriş/kayıt olur → `claim-certificate` ile sahiplik alır.
4. Sahip, `transfer-start` ile alıcı e-postasına 6 haneli kod gönderir; alıcı `transfer-accept` ile sahipliği devralır.
5. Her doğrulama/okutma `log-scan` ile `scan_events` tablosuna yazılır (admin analitiği).

---

## 2. Enum

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
```

---

## 3. Tablo Şeması

> **Kritik kural:** `public` şemasındaki her `CREATE TABLE` sonrası **aynı migration içinde** `GRANT` verilmelidir.
> Sıra: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`.
> RLS tek başına yetmez; GRANT yoksa PostgREST "permission denied" döner.

### 3.1 `profiles` — Kullanıcı profili
`auth.users` ile 1-1. Trigger ile otomatik oluşur.

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | `auth.users.id` referansı |
| `email` | text | kayıt e-postası |
| `display_name` | text | görünen ad |
| `full_name` | text | ad soyad (kayıt formunda zorunlu) |
| `phone` | text | telefon (kayıt formunda zorunlu) |
| `created_at` / `updated_at` | timestamptz | default `now()` |

**RLS**
- SELECT: `auth.uid() = id` **veya** `has_role(auth.uid(),'admin')`
- INSERT / UPDATE: yalnızca kendi satırı (`auth.uid() = id`)
- DELETE: politika yok → yasak

---

### 3.2 `user_roles` — Roller (ASLA profiles içinde tutulmaz)
Rolün ayrı tabloda tutulması yetki yükseltme (privilege escalation) saldırılarını önler.

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | `auth.users.id` |
| `role` | `app_role` NOT NULL | |
| `created_at` | timestamptz | |
| | | `UNIQUE (user_id, role)` |

**RLS**
- SELECT: sadece admin (`has_role`)
- INSERT / UPDATE / DELETE: politika yok → sadece `service_role` (edge function) yazabilir

---

### 3.3 `certificates` — Ürün / orijinallik sertifikası (çekirdek tablo)

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `auth_code` | text NOT NULL | herkese açık doğrulama kodu (`/verify/:code`) |
| `product_name` | text NOT NULL | |
| `brand`, `size`, `colorway` | text | |
| `condition` | text NOT NULL | default `'New / Deadstock'` |
| `image_url` | text | `item-images` bucket'ındaki **path** (URL değil) |
| `verified_date` | date NOT NULL | default `CURRENT_DATE` |
| `purchase_date` | date | |
| `current_owner` | text | görünen sahip (maskeli) |
| `notes` | text | |
| `is_published` | boolean NOT NULL | default `true` → herkese açık görünürlük |
| `owner_user_id` | uuid | gerçek sahip; `auth.users.id` |
| `owner_masked` | text | `m***y@g***l.com` formatı |
| `claim_token` | text NOT NULL | 64 hane hex; QR içeriği. **Gizli** |
| `claimed_at` | timestamptz | |
| `assigned_email` | text | admin'in atadığı e-posta (hesap yoksa beklemede) |
| `assigned_at` | timestamptz | |
| `claim_locked` | boolean NOT NULL | `true` ise sadece `assigned_email` claim edebilir |
| `shopify_order_id` / `shopify_order_name` / `shopify_line_item_id` | text | sipariş izlenebilirliği |
| `created_at` / `updated_at` | timestamptz | updated_at trigger'lı |

`claim_token` default:
```sql
replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')
```

**RLS**
- `Published certificates are public` — SELECT (anon+auth): `is_published = true`
- `Owners can view their certificates` — SELECT (auth): `owner_user_id = auth.uid()`
- `Admins can view all certificates` — SELECT (auth): `has_role(auth.uid(),'admin')`
- `Admins manage certificates` — ALL (auth): `has_role(auth.uid(),'admin')`

**Kolon seviyesi güvenlik:** `claim_token` üzerindeki SELECT hakkı `anon` ve `authenticated`'tan **REVOKE** edilmiştir; token'a yalnızca `get_claim_token()` RPC'si üzerinden erişilir.

---

### 3.4 `ownership_history` — Sahiplik geçmişi (provenance)

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `certificate_id` | uuid NOT NULL FK → `certificates.id` | |
| `owner_handle` | text NOT NULL | maskeli sahip gösterimi |
| `owner_user_id` | uuid | |
| `kind` | text NOT NULL | `manual` \| `claim` \| `transfer` \| `assignment` \| `unassign` |
| `transferred_at` | date NOT NULL | default `CURRENT_DATE` |
| `note` | text | |
| `created_at` | timestamptz | |

**RLS**
- SELECT (anon+auth): ilgili sertifika `is_published = true` ise
- SELECT (auth): sertifikanın sahibi ise
- SELECT + ALL: admin

---

### 3.5 `scan_events` — QR / doğrulama trafiği (analitik)

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `certificate_id` | uuid FK → `certificates.id` | |
| `auth_code` | text | |
| `kind` | text NOT NULL | `verify` \| `claim` \| `scan` |
| `country`, `city` | text | edge geo header'larından |
| `device_type`, `browser`, `os` | text | UA parse |
| `referrer`, `user_agent` | text | |
| `ip_hash` | text | ham IP değil, SHA-256 hash (KVKK/GDPR) |
| `created_at` | timestamptz | |

**RLS**
- INSERT (anon+auth): `certificate_id` gerçekten var olan bir sertifikaya işaret ediyorsa
- SELECT: admin veya ilgili sertifikanın sahibi
- UPDATE / DELETE: yasak (append-only)

---

### 3.6 `transfer_requests` — E-posta kodu ile sahiplik devri

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `certificate_id` | uuid NOT NULL FK | |
| `from_user_id` | uuid | gönderen sahip |
| `to_email` | text NOT NULL | alıcı |
| `code_hash` | text NOT NULL | 6 haneli kodun SHA-256'sı (**kod asla plain saklanmaz**) |
| `status` | text NOT NULL | `pending` \| `accepted` \| `expired` \| `cancelled` |
| `attempts` | int NOT NULL | brute-force koruması |
| `expires_at` | timestamptz NOT NULL | default `now() + 24h` |
| `accepted_by` | uuid | |
| `accepted_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

**RLS**
- SELECT: gönderen (`from_user_id = auth.uid()`) veya admin
- INSERT / UPDATE / DELETE: yasak → yalnızca edge function (`service_role`)

---

### 3.7 `shopify_orders` — Ham webhook kaydı (idempotency + denetim)

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `shopify_order_id` | text NOT NULL | tekilleştirme anahtarı |
| `order_name` | text | `#1024` gibi |
| `customer_email` | text | |
| `payload` | jsonb NOT NULL | tam webhook gövdesi |
| `processed_at` | timestamptz | işlendi mi |
| `created_at` | timestamptz | |

**RLS**: SELECT sadece admin; yazma yalnızca `service_role`.

---

## 4. Veritabanı Fonksiyonları

Tümü `SET search_path = public` ile tanımlıdır.

### `has_role(_user_id uuid, _role app_role) → boolean` · SECURITY DEFINER, STABLE
RLS içinde rol kontrolü. SECURITY DEFINER olması `user_roles` üzerinde **özyinelemeli RLS** (infinite recursion) hatasını önler. RLS politikalarında `has_role(auth.uid(),'admin')` şeklinde kullanılır.

### `handle_new_user() → trigger` · SECURITY DEFINER
`auth.users` INSERT sonrası çalışır:
1. `profiles` satırını oluşturur (`full_name`, `phone`, `display_name` metadata'dan).
2. E-postayı maskeler.
3. `assigned_email` bu e-postaya eşit ve **sahipsiz** sertifikaları otomatik olarak yeni kullanıcıya devreder.
4. `ownership_history`'ye `assignment` kaydı yazar.

> Bu sayede admin, henüz hesabı olmayan bir e-postaya ürün atayabilir; kullanıcı kayıt olduğu anda ürün hesabına düşer.

### `bootstrap_first_admin() → trigger` · SECURITY DEFINER
Sistemde hiç `admin` yoksa ilk kayıt olan kullanıcıya `admin` rolü verir. Canlıya çıkmadan önce ilk admin oluşturulduktan sonra bu trigger'ı kaldırmanız önerilir.

### `get_claim_token(_certificate_id uuid) → text` · SECURITY DEFINER, STABLE
`claim_token`'ı yalnızca admin'e veya sertifikanın sahibine döner. Frontend QR'ı bu RPC ile çizer.

### `update_updated_at_column() → trigger`
`NEW.updated_at = now()`. `certificates`, `profiles`, `transfer_requests` üzerinde BEFORE UPDATE.

### Trigger bağlantıları
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_bootstrap_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();
```

---

## 5. Storage

| Bucket | Public | Kullanım |
|---|---|---|
| `item-images` | **Hayır** | Ürün görselleri. DB'de sadece path saklanır, frontend `createSignedUrl` ile okur. |

Policies: yükleme/silme admin'e, okuma signed URL üzerinden.

---

## 6. Edge Functions

Ortak: CORS header'ları, `Authorization: Bearer <jwt>` doğrulaması, `service_role` client'ı yalnızca yetki kontrolünden **sonra** kullanılır.

| Function | JWT | Görev |
|---|---|---|
| `shopify-order-webhook` | Hayır (HMAC) | `X-Shopify-Hmac-Sha256` doğrular → `shopify_orders` kaydı → her line item için `certificates` + `claim_token` üretir. `shopify_order_id` ile idempotent. |
| `claim-certificate` | Evet | Token ile sertifika bulur; sahipsizse ve `claim_locked` değilse (ya da `assigned_email` kullanıcıya aitse) sahipliği verir, `ownership_history` + `scan_events` yazar. `UPDATE ... WHERE owner_user_id IS NULL` ile yarış koşulu (race) engellenir. |
| `transfer-start` | Evet | Sahip doğrulanır → 6 haneli kod üretilir → SHA-256 hash'i `transfer_requests`'e yazılır → alıcıya e-posta gider (24 saat geçerli). |
| `transfer-accept` | Evet | Kod hash'i karşılaştırılır, `attempts` artar, süre kontrol edilir → `certificates.owner_user_id` güncellenir, `ownership_history`'ye `transfer` kaydı düşer. |
| `admin-assign-certificate` | Evet + admin | Sertifikayı bir e-postaya atar (hesap varsa doğrudan devreder, yoksa `assigned_email` olarak bekletir) veya `unassign` yapar; `claim_locked` ayarlar. |
| `log-scan` | Hayır | `scan_events`'e IP hash'li, ülke/şehir/cihaz bilgili kayıt atar. |

Gerekli secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SHOPIFY_WEBHOOK_SECRET`, (e-posta gönderimi için) `RESEND_API_KEY`.

Yardımcı: `supabase/functions/_shared/mask.ts` → `maskEmail()`, `sha256Hex()`.

---

## 7. Güvenlik İlkeleri (bozulmaması gerekenler)

1. Roller **asla** `profiles`/`users` tablosunda tutulmaz → `user_roles` + `has_role`.
2. RLS her `public` tabloda açık; GRANT'ler her tablo için açıkça verilir.
3. `claim_token` istemciye asla ham SELECT ile açılmaz → `get_claim_token` RPC.
4. Transfer kodları hash'lenir, süreli ve deneme sayacı vardır.
5. IP adresleri hash'lenerek saklanır.
6. `scan_events`, `transfer_requests`, `shopify_orders` istemciden yazılamaz/silinemez.
7. Shopify webhook'u HMAC olmadan asla işleme alınmaz.
8. `service_role` anahtarı yalnızca edge function içinde kullanılır, frontend'e girmez.

---

## 8. Sıfırdan Kurulum İçin Prompt

Aşağıdaki metni yeni bir Supabase/Lovable projesinde doğrudan prompt olarak kullanabilirsiniz.

```text
Sınırlı sayıda üretilen ürünlerin orijinallik sertifikalarını yöneten bir sistemin
backend'ini Supabase üzerinde kur. Aşağıdaki yapıyı tek migration ile oluştur;
her public tablo için CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY sırasını uygula.

ENUM: app_role ('admin','user')

TABLOLAR
1) profiles: id uuid PK (auth.users referansı), email, display_name, full_name, phone,
   created_at, updated_at. RLS: kullanıcı kendi satırını görür/günceller; admin hepsini görür; delete yok.
2) user_roles: id, user_id uuid, role app_role, created_at, UNIQUE(user_id, role).
   RLS: select sadece admin; insert/update/delete yok (sadece service_role).
   Rolleri kesinlikle profiles içinde tutma.
3) certificates: id, auth_code text NOT NULL, product_name NOT NULL, brand, size, colorway,
   condition NOT NULL default 'New / Deadstock', image_url (storage path), verified_date date
   default CURRENT_DATE, purchase_date, current_owner, notes, is_published bool default true,
   owner_user_id uuid, owner_masked text, claim_token text NOT NULL default
   (replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')),
   claimed_at, assigned_email, assigned_at, claim_locked bool default false,
   shopify_order_id, shopify_order_name, shopify_line_item_id, created_at, updated_at.
   RLS: is_published=true olanlar herkese açık okunur; sahibi kendi kaydını görür; admin her şeyi yönetir.
   claim_token kolonunda SELECT hakkını anon ve authenticated rollerinden REVOKE et.
4) ownership_history: id, certificate_id FK, owner_handle NOT NULL, owner_user_id,
   kind text default 'manual' (claim|transfer|assignment|unassign|manual),
   transferred_at date default CURRENT_DATE, note, created_at.
   RLS: yayınlanmış sertifikanın geçmişi herkese açık; sahibi ve admin görebilir; yazma sadece admin/service_role.
5) scan_events (append-only): id, certificate_id FK, auth_code, kind default 'verify',
   country, city, device_type, browser, os, referrer, ip_hash, user_agent, created_at.
   RLS: anon+authenticated INSERT edebilir ancak yalnızca var olan bir certificate_id ile;
   SELECT admin veya sertifika sahibi; UPDATE/DELETE yok.
6) transfer_requests: id, certificate_id FK, from_user_id, to_email NOT NULL,
   code_hash NOT NULL (6 haneli kodun SHA-256'sı), status default 'pending', attempts int default 0,
   expires_at default now()+interval '24 hours', accepted_by, accepted_at, created_at, updated_at.
   RLS: SELECT gönderen veya admin; INSERT/UPDATE/DELETE yok (sadece edge function).
7) shopify_orders: id, shopify_order_id NOT NULL, order_name, customer_email,
   payload jsonb default '{}', processed_at, created_at. RLS: SELECT sadece admin, yazma yok.

FONKSİYONLAR (hepsi SET search_path = public)
- has_role(_user_id uuid, _role app_role) returns boolean, SQL, STABLE, SECURITY DEFINER;
  user_roles'ta eşleşme var mı diye bakar. Tüm RLS politikalarında bunu kullan.
- handle_new_user() trigger SECURITY DEFINER: auth.users INSERT sonrası profiles satırı açar
  (metadata'dan full_name/phone/display_name), e-postayı maskeler ve
  assigned_email'i bu e-posta olan sahipsiz sertifikaları yeni kullanıcıya devreder,
  ownership_history'ye 'assignment' kaydı yazar.
- bootstrap_first_admin() trigger SECURITY DEFINER: hiç admin yoksa ilk kullanıcıya admin rolü verir.
- get_claim_token(_certificate_id uuid) returns text SECURITY DEFINER:
  claim_token'ı yalnızca admin'e veya sertifika sahibine döner.
- update_updated_at_column() trigger: updated_at = now(); certificates, profiles,
  transfer_requests üzerinde BEFORE UPDATE tetikleyicisi kur.
- auth.users AFTER INSERT üzerine handle_new_user ve bootstrap_first_admin trigger'larını bağla.

STORAGE
- 'item-images' adında PRIVATE bucket; yükleme/silme admin'e ait, okuma signed URL ile.

EDGE FUNCTIONS
- shopify-order-webhook (JWT kapalı): X-Shopify-Hmac-Sha256 imzasını SHOPIFY_WEBHOOK_SECRET ile
  doğrula, shopify_orders'a ham payload yaz, her line item için certificates kaydı ve claim_token üret.
  shopify_order_id ile idempotent olsun.
- claim-certificate (JWT): token ile sertifikayı bul; sahipsizse sahipliği ver
  (UPDATE ... WHERE owner_user_id IS NULL ile yarış koşulunu engelle), claim_locked ise
  yalnızca assigned_email sahibi claim edebilsin; ownership_history + scan_events yaz.
- transfer-start (JWT): sahibi doğrula, 6 haneli kod üret, SHA-256 hash'ini transfer_requests'e yaz,
  alıcı e-postasına kodu gönder (24 saat geçerli).
- transfer-accept (JWT): kodu hash'leyip karşılaştır, attempts artır, süre kontrolü yap,
  sahipliği devret ve ownership_history'ye 'transfer' kaydı ekle.
- admin-assign-certificate (JWT + has_role admin): sertifikayı bir e-postaya ata; e-postaya bağlı
  hesap varsa doğrudan devret, yoksa assigned_email olarak beklet; claim_locked ayarla; unassign desteği ekle.
- log-scan (JWT kapalı): IP'yi SHA-256 ile hash'leyerek ülke/şehir/cihaz/tarayıcı bilgisiyle
  scan_events kaydı oluştur.

GÜVENLİK
Ham IP saklama, transfer kodunu plain saklama, claim_token'ı istemciye açma,
service_role anahtarını frontend'e koyma. Rolleri ayrı tabloda tut.
```

---

## 9. Kendi Supabase Projenize Taşıma Adımları

1. Yeni Supabase projesi aç, `Settings → API` → `URL` ve `anon key`'i al.
2. Yukarıdaki şemayı tek migration olarak çalıştır (`supabase/migrations/` altına koy → `supabase db push`).
3. `item-images` bucket'ını private olarak oluştur.
4. Auth → Providers: Email/Password aç, "Confirm email" tercihine göre ayarla.
5. `supabase functions deploy <name>` ile 6 fonksiyonu deploy et; `shopify-order-webhook` ve `log-scan` için `verify_jwt = false` ayarla (`supabase/config.toml`).
6. Secrets: `supabase secrets set SHOPIFY_WEBHOOK_SECRET=... RESEND_API_KEY=...`
7. Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
8. Shopify Admin → Settings → Notifications → Webhooks: `orders/paid` →
   `https://<project-ref>.supabase.co/functions/v1/shopify-order-webhook`
9. İlk kullanıcıyı kaydet (otomatik admin olur), ardından `bootstrap_first_admin` trigger'ını kaldır.
10. `npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`
