import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

/** Renders a QR code as a monochrome image matching the archive aesthetic. */
export const QrCode = ({ value, size = 180, className = "", alt = "QR kod" }: Props) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#f5f3ef" },
      errorCorrectionLevel: "M",
    })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={`border-2 border-foreground bg-secondary ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`border-2 border-foreground ${className}`}
    />
  );
};
