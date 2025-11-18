/**
 * Aptos Browser Wallet Connection Utility
 * Detects and connects to available Aptos wallet browser extensions
 */

export interface AptosWallet {
  name: string;
  icon?: string;
  iconPath?: string; // Path to icon image
  connect: () => Promise<string>; // Returns wallet address
  isInstalled: () => boolean;
}

// Check if Petra wallet is installed
function isPetraInstalled(): boolean {
  return typeof window !== "undefined" && "aptos" in window;
}

// Check if Martian wallet is installed
function isMartianInstalled(): boolean {
  return typeof window !== "undefined" && "martian" in window;
}

// Check if Pontem wallet is installed
function isPontemInstalled(): boolean {
  return typeof window !== "undefined" && "pontem" in window;
}

// Check if Fewcha wallet is installed
function isFewchaInstalled(): boolean {
  return typeof window !== "undefined" && "fewcha" in window;
}

// Check if OKX wallet is installed
function isOKXInstalled(): boolean {
  return (
    typeof window !== "undefined" &&
    "okxwallet" in window &&
    (window as any).okxwallet?.aptos
  );
}

/**
 * Get all available Aptos wallets
 * Prioritizes OKX and Petra wallets
 */
export function getAvailableWallets(): AptosWallet[] {
  const wallets: AptosWallet[] = [];

  // OKX Wallet (Priority 1)
  if (isOKXInstalled()) {
    wallets.push({
      name: "OKX",
      icon: "🔷",
      iconPath: "/okx.png",
      isInstalled: isOKXInstalled,
      connect: async () => {
        const okx = (window as any).okxwallet?.aptos;
        if (!okx) {
          throw new Error("OKX wallet not found");
        }

        try {
          // Connect to wallet
          const response = await okx.connect();

          // Get account address
          let address: string;
          if (response?.address) {
            address = response.address;
          } else if (okx.account) {
            const account = await okx.account();
            address = account?.address || account;
          } else {
            address = await okx.account();
          }

          if (!address) {
            throw new Error("Failed to get wallet address");
          }

          return address;
        } catch (error: any) {
          if (error.code === 4001 || error.code === "UserRejected") {
            throw new Error("User rejected the connection request");
          }
          throw new Error(error.message || "Failed to connect to OKX wallet");
        }
      },
    });
  }

  // Petra Wallet (Official Aptos Wallet) (Priority 2)
  if (isPetraInstalled()) {
    wallets.push({
      name: "Petra",
      icon: "🦎",
      iconPath: "/petra.png",
      isInstalled: isPetraInstalled,
      connect: async () => {
        const aptos = (window as any).aptos;
        if (!aptos) {
          throw new Error("Petra wallet not found");
        }

        try {
          // Connect to wallet - Petra uses connect() which may return account info
          const response = await aptos.connect();

          // Get account address - Petra may return it in response or need separate call
          let address: string;
          if (response?.address) {
            address = response.address;
          } else if (aptos.account) {
            const account = await aptos.account();
            address = account?.address || account;
          } else {
            // Fallback: try to get from network
            address = await aptos.account();
          }

          if (!address) {
            throw new Error("Failed to get wallet address");
          }

          return address;
        } catch (error: any) {
          if (error.code === 4001 || error.code === "UserRejected") {
            throw new Error("User rejected the connection request");
          }
          throw new Error(error.message || "Failed to connect to Petra wallet");
        }
      },
    });
  }

  // Martian Wallet
  if (isMartianInstalled()) {
    wallets.push({
      name: "Martian",
      icon: "👽",
      isInstalled: isMartianInstalled,
      connect: async () => {
        const martian = (window as any).martian;
        if (!martian) {
          throw new Error("Martian wallet not found");
        }

        try {
          // Connect to wallet
          const response = await martian.connect();

          // Get account address
          let address: string;
          if (response?.address) {
            address = response.address;
          } else if (martian.account) {
            const account = await martian.account();
            address = account?.address || account;
          } else {
            address = await martian.account();
          }

          if (!address) {
            throw new Error("Failed to get wallet address");
          }

          return address;
        } catch (error: any) {
          if (error.code === 4001 || error.code === "UserRejected") {
            throw new Error("User rejected the connection request");
          }
          throw new Error(
            error.message || "Failed to connect to Martian wallet"
          );
        }
      },
    });
  }

  // Pontem Wallet
  if (isPontemInstalled()) {
    wallets.push({
      name: "Pontem",
      icon: "🌉",
      isInstalled: isPontemInstalled,
      connect: async () => {
        const pontem = (window as any).pontem;
        if (!pontem) {
          throw new Error("Pontem wallet not found");
        }

        try {
          // Connect to wallet
          const response = await pontem.connect();

          // Get account address
          let address: string;
          if (response?.address) {
            address = response.address;
          } else if (pontem.account) {
            const account = await pontem.account();
            address = account?.address || account;
          } else {
            address = await pontem.account();
          }

          if (!address) {
            throw new Error("Failed to get wallet address");
          }

          return address;
        } catch (error: any) {
          if (error.code === 4001 || error.code === "UserRejected") {
            throw new Error("User rejected the connection request");
          }
          throw new Error(
            error.message || "Failed to connect to Pontem wallet"
          );
        }
      },
    });
  }

  // Fewcha Wallet
  if (isFewchaInstalled()) {
    wallets.push({
      name: "Fewcha",
      icon: "🦊",
      isInstalled: isFewchaInstalled,
      connect: async () => {
        const fewcha = (window as any).fewcha;
        if (!fewcha) {
          throw new Error("Fewcha wallet not found");
        }

        try {
          // Connect to wallet
          const response = await fewcha.connect();

          // Get account address
          let address: string;
          if (response?.address) {
            address = response.address;
          } else if (fewcha.account) {
            const account = await fewcha.account();
            address = account?.address || account;
          } else {
            address = await fewcha.account();
          }

          if (!address) {
            throw new Error("Failed to get wallet address");
          }

          return address;
        } catch (error: any) {
          if (error.code === 4001 || error.code === "UserRejected") {
            throw new Error("User rejected the connection request");
          }
          throw new Error(
            error.message || "Failed to connect to Fewcha wallet"
          );
        }
      },
    });
  }

  return wallets;
}

/**
 * Connect to the first available wallet
 */
export async function connectToWallet(): Promise<{
  address: string;
  walletName: string;
}> {
  const wallets = getAvailableWallets();

  if (wallets.length === 0) {
    throw new Error(
      "No Aptos wallet extensions found. Please install Petra, Martian, Pontem, or Fewcha wallet."
    );
  }

  // Try to connect to the first available wallet (usually Petra)
  const wallet = wallets[0];
  const address = await wallet.connect();

  return {
    address,
    walletName: wallet.name,
  };
}

/**
 * Connect to a specific wallet by name
 */
export async function connectToSpecificWallet(
  walletName: string
): Promise<{ address: string; walletName: string }> {
  const wallets = getAvailableWallets();
  const wallet = wallets.find(
    (w) => w.name.toLowerCase() === walletName.toLowerCase()
  );

  if (!wallet) {
    throw new Error(
      `Wallet "${walletName}" is not installed or not available.`
    );
  }

  const address = await wallet.connect();

  return {
    address,
    walletName: wallet.name,
  };
}
