import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";
import { DepositModal } from "@/components/wallet/DepositModal";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";

export const metadata: Metadata = {
  title: "FRX Arcade — Liquidity-Powered Competitive Gaming",
  description:
    "Uniswap V4 Hook-powered gaming economy on X Layer. Swap into FRX Credits, compete in Tile Rush tournaments, earn rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <WalletConnectModal />
          <DepositModal />
          <WithdrawModal />
        </Providers>
      </body>
    </html>
  );
}
