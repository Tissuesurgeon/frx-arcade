import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 32, className = "" }: BrandLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}
