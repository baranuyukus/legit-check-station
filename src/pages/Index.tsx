import meezyLogo from "@/assets/meezy-logo.png";
import hoodie from "@/assets/hoodie.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <img src={meezyLogo} alt="Meezy Archive" className="h-16 object-contain" />
          <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground">
            Authenticity Verification
          </p>
        </div>

        {/* Verification Badge */}
        <div className="border-2 border-foreground p-4 text-center">
          <p className="text-sm tracking-[0.3em] uppercase font-bold">
            ✓ Item Authenticated
          </p>
        </div>

        {/* Product Section */}
        <div className="border-2 border-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Product Image */}
            <div className="border-b-2 md:border-b-0 md:border-r-2 border-foreground p-8 flex items-center justify-center bg-secondary">
              <img
                src={hoodie}
                alt="Denim Tears Mono Cotton Wreath Hoodie Navy On Navy"
                className="max-h-72 object-contain"
              />
            </div>

            {/* Product Details */}
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Item</p>
                <p className="text-sm font-bold tracking-wide uppercase leading-tight">
                  Denim Tears Mono Cotton Wreath Hoodie Navy On Navy
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Size</p>
                  <p className="text-sm font-bold">M</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Condition</p>
                  <p className="text-sm font-bold">New / Deadstock</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Auth ID</p>
                  <p className="text-sm font-bold">MA-2026-00487</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Date</p>
                  <p className="text-sm font-bold">03.24.2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Footer */}
        <div className="border-2 border-foreground p-6 space-y-4">
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Certificate of Authenticity
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This item has been verified through Meezy Archive's multi-point authentication process.
            Each product undergoes rigorous inspection by our expert team to ensure originality
            and condition accuracy. This certificate confirms the item meets all authenticity standards.
          </p>
          <div className="pt-2 border-t border-muted-foreground/20 flex items-center justify-between">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Meezy Archive © 2026
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              meezyarchive.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
