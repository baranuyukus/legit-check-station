

# Meezy Archive — Authenticity Verification Page

A single-page authenticity certificate for Meezy Archive resell site.

## Design
- **Background**: Off-white/cream (`#f5f3ef`)
- **Borders**: Sharp, hard black borders — no rounded corners
- **Font**: Monospace/mechanical feel (using `font-mono` or a geometric sans like Inter with tight letter-spacing)
- **Color palette**: Black, off-white, minimal — corporate and clean
- **Layout**: Centered card with structured sections, very editorial/document-like

## Page Structure

1. **Header**: Meezy Archive logo (uploaded) centered, with "AUTHENTICITY VERIFIED" text below in mono font
2. **Verification Badge**: A bold status block — "ITEM AUTHENTICATED ✓" with a hard black border
3. **Product Section**: 
   - Product image (uploaded hoodie) on left
   - Product details on right: Name, Size, Colorway, Authentication ID (mock), Date
4. **Certificate Details**:
   - Authentication ID: `MA-2026-00487`
   - Verification Date: March 24, 2026
   - Condition: New/Deadstock
   - Item: Denim Tears Mono Cotton Wreath Hoodie Navy On Navy
   - Size: M
5. **Footer**: "This item has been verified through Meezy Archive's multi-point authentication process. Each product undergoes rigorous inspection by our expert team." + small Meezy branding

## Files
- Copy both uploaded images to `src/assets/`
- Build the full page in `src/pages/Index.tsx`
- Update CSS variables for the off-white theme

