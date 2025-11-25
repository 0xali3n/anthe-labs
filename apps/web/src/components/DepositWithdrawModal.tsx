"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Wallet,
  ArrowDown,
  ArrowUp,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  getWalletAccountBalance,
  checkWalletAndDeposit,
  withdrawFromKana,
  transferUSDTToAddress,
  getTradingBalance,
} from "@/lib/walletsApi";

// Dynamically import QRCode to avoid SSR issues
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG) as any,
  { ssr: false }
) as any;

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string | null;
  balance?: string;
  onRefreshBalance?: () => void | Promise<void>;
  isRefreshingBalance?: boolean;
}

export default function DepositWithdrawModal({
  isOpen,
  onClose,
  walletAddress,
  balance = "0.00",
  onRefreshBalance,
  isRefreshingBalance = false,
}: DepositWithdrawModalProps) {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [tradingBalance, setTradingBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "processing" | "info";
    message: string;
    txHash?: string;
    step?: string;
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isRefreshingRef = useRef(false); // Prevent infinite loops
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup timeouts
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup copy timeout
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup refresh timeout

  const isFetchingRef = useRef(false); // Prevent multiple simultaneous calls

  // Function to fetch trading account balance
  const fetchTradingBalance = useCallback(async () => {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setIsLoadingBalance(true);
      console.log(`📊 Calling getTradingBalance API...`);

      const result = await getTradingBalance();

      if (result.success && result.balance !== undefined) {
        const balance = parseFloat(result.balance).toFixed(2);
        setTradingBalance(balance);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Trading Account Balance Fetched Successfully");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`💵 Trading Balance: ${balance} USDT`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      } else {
        console.error("❌ Failed to fetch trading balance:", result.error);
        setTradingBalance("0.00");
      }
    } catch (error: any) {
      console.error("❌ Error fetching trading balance:", error);
      setTradingBalance("0.00");
    } finally {
      setIsLoadingBalance(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Function to fetch wallet account balance and auto-deposit if balance > 1 USDT (for deposit tab)
  const fetchWalletBalance = useCallback(
    async (showNotifications = false) => {
      if (!walletAddress || isFetchingRef.current) return;

      try {
        isFetchingRef.current = true;
        setIsLoadingBalance(true);

        if (showNotifications) {
          setNotification({
            type: "processing",
            message: "Checking for deposits...",
          });
        }

        console.log(
          `📊 Calling getWalletAccountBalance API for address: ${walletAddress}`
        );

        const result = await getWalletAccountBalance();

        if (result.success && result.balance !== undefined) {
          const balance = parseFloat(result.balance).toFixed(2);
          const balanceNum = parseFloat(result.balance);
          setWalletBalance(balance);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ Wallet Account Balance Fetched Successfully");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(`💰 Wallet Address: ${walletAddress}`);
          console.log(`💵 Balance: ${balance} USDT`);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

          // Auto-deposit if balance is greater than 1 USDT
          if (balanceNum > 1) {
            if (showNotifications) {
              setNotification({
                type: "processing",
                message: `Deposit found! Transferring ${balance} USDT to trading account...`,
              });
            }

            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("🔄 AUTO-DEPOSIT PROCESS STARTING");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`📊 Step 1: Balance Check`);
            console.log(`   Wallet Address: ${walletAddress}`);
            console.log(`   Current Balance: ${balance} USDT`);
            console.log(`   Threshold: 1 USDT`);
            console.log(`   Status: Balance (${balance} USDT) > 1 USDT ✅`);
            console.log("");
            console.log(`📤 Step 2: Initiating Deposit to Trading Account...`);
            console.log(`   From Wallet: ${walletAddress}`);
            console.log(`   To: Trading Account (Kana Labs)`);
            console.log(`   Amount: ${balance} USDT`);

            const depositResult = await checkWalletAndDeposit();

            console.log("");
            console.log(`📋 Step 3: Deposit Result Received`);
            console.log(`   Success: ${depositResult.success}`);

            if (depositResult.success) {
              if (depositResult.deposited && depositResult.txHash) {
                console.log(
                  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                );
                console.log("✅ AUTO-DEPOSIT SUCCESSFUL");
                console.log(
                  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                );
                console.log(`📊 Transaction Details:`);
                console.log(`   From Wallet: ${walletAddress}`);
                console.log(`   To: Trading Account`);
                console.log(
                  `   Amount Deposited: ${depositResult.walletBalance || balance} USDT`
                );
                console.log(`   Transaction Hash: ${depositResult.txHash}`);
                console.log(
                  `   Updated Trading Balance: ${depositResult.tradingBalance || "0.00"} USDT`
                );
                console.log(
                  `   View on Aptoscan: https://aptoscan.com/txn/${depositResult.txHash}`
                );
                console.log(
                  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                );

                // Update wallet balance to 0 after successful deposit
                setWalletBalance("0.00");

                // Show success notification
                if (showNotifications) {
                  setNotification({
                    type: "success",
                    message: `Success! ${depositResult.walletBalance || balance} USDT transferred to trading account`,
                    txHash: depositResult.txHash,
                  });
                  setTimeout(() => setNotification(null), 8000);
                }

                // Refresh trading balance in navbar
                if (onRefreshBalance) {
                  await onRefreshBalance();
                }
                await fetchTradingBalance();
              } else {
                if (showNotifications) {
                  setNotification({
                    type: "error",
                    message: depositResult.error || "Deposit not completed",
                  });
                  setTimeout(() => setNotification(null), 5000);
                }
                console.log(`⚠️ Step 3: Deposit Not Completed`);
                console.log(
                  `   Reason: ${depositResult.error || "Unknown reason"}`
                );
              }
            } else {
              if (showNotifications) {
                setNotification({
                  type: "error",
                  message: depositResult.error || "Deposit failed",
                });
                setTimeout(() => setNotification(null), 5000);
              }
              console.log(
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
              );
              console.log("❌ AUTO-DEPOSIT FAILED");
              console.log(
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
              );
              console.log(
                `   Error: ${depositResult.error || "Unknown error"}`
              );
            }
          } else {
            if (showNotifications) {
              setNotification({
                type: "info",
                message: `No deposit found. Current balance: ${balance} USDT (minimum 1 USDT required)`,
              });
              setTimeout(() => setNotification(null), 4000);
            }
            console.log(
              `ℹ️ Balance (${balance} USDT) is less than or equal to 1 USDT - No auto-deposit`
            );
          }
        } else {
          if (showNotifications) {
            setNotification({
              type: "error",
              message: result.error || "Failed to check balance",
            });
            setTimeout(() => setNotification(null), 4000);
          }
          console.error("❌ Failed to fetch wallet balance:", result.error);
          setWalletBalance("0.00");
        }
      } catch (error: any) {
        if (showNotifications) {
          setNotification({
            type: "error",
            message: error.message || "Error checking for deposits",
          });
          setTimeout(() => setNotification(null), 4000);
        }
        console.error("❌ Error fetching wallet balance:", error);
        setWalletBalance("0.00");
      } finally {
        setIsLoadingBalance(false);
        isFetchingRef.current = false;
      }
    },
    [walletAddress, onRefreshBalance, fetchTradingBalance]
  );

  // Fetch wallet account balance when modal opens (only once)
  useEffect(() => {
    if (isOpen && walletAddress && !isFetchingRef.current) {
      console.log("🔄 Modal opened - Fetching wallet account balance...");
      fetchWalletBalance();
    }
  }, [isOpen, walletAddress, fetchWalletBalance]);

  // Close modal on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Sync local ref with parent's loading state to prevent infinite loops
  useEffect(() => {
    // When parent finishes refreshing, reset our local ref
    if (!isRefreshingBalance && isRefreshingRef.current) {
      // Clear any pending timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      // Reset ref after a small delay to ensure state is stable
      const syncTimeout = setTimeout(() => {
        isRefreshingRef.current = false;
      }, 100);
      return () => clearTimeout(syncTimeout);
    }
  }, [isRefreshingBalance]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form states when modal closes
      setActiveTab("deposit");
      setDepositAmount("");
      setWithdrawAmount("");
      setWithdrawAddress("");
      setCopied(false);
      setIsProcessing(false);
      isRefreshingRef.current = false;

      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // Clear previous timeout if exists
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setIsProcessing(true);
    // TODO: Implement deposit logic
    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      setIsProcessing(false);
      setDepositAmount("");
      // Refresh balance after deposit
      if (onRefreshBalance && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          await onRefreshBalance();
        } catch (error) {
          console.error("Error refreshing balance after deposit:", error);
        } finally {
          isRefreshingRef.current = false;
        }
      }
      timeoutRef.current = null;
    }, 2000);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setNotification({
        type: "error",
        message: "Please enter a valid withdrawal amount",
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    if (
      !withdrawAddress ||
      !withdrawAddress.trim() ||
      !withdrawAddress.startsWith("0x")
    ) {
      setNotification({
        type: "error",
        message:
          "Please enter a valid Aptos wallet address (must start with 0x)",
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const tradingBalanceNum = parseFloat(tradingBalance || balance);

    if (amount > tradingBalanceNum) {
      setNotification({
        type: "error",
        message: `Insufficient balance. Available: ${tradingBalanceNum.toFixed(2)} USDT`,
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setIsProcessing(true);

    // Show processing notification immediately
    setNotification({
      type: "processing",
      message: "Withdrawing from trading account...",
      step: "withdraw",
    });

    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔄 2-WAY TRANSFER PROCESS STARTING");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📍 Step 1: Initialization`);
      console.log(`   Amount: ${amount} USDT`);
      console.log(`   Destination: ${withdrawAddress}`);
      console.log(`   Market ID: 14 (APT-USD)`);
      console.log("");

      // Step 1: Withdraw from Trading Account to Wallet
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📥 STEP 1: WITHDRAW FROM TRADING ACCOUNT");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `   Current Trading Balance: ${tradingBalanceNum.toFixed(2)} USDT`
      );
      console.log(`   Withdrawing: ${amount} USDT`);
      console.log("");

      const withdrawResult = await withdrawFromKana(amount, "14");

      if (!withdrawResult.success) {
        console.error("❌ STEP 1 FAILED:", withdrawResult.error);
        setNotification({
          type: "error",
          message: `Withdrawal failed: ${withdrawResult.error || "Unknown error"}`,
        });
        setTimeout(() => setNotification(null), 5000);
        setIsProcessing(false);
        return;
      }

      if (!withdrawResult.txHash) {
        console.error("❌ No transaction hash received");
        setNotification({
          type: "error",
          message: "Withdrawal initiated but no transaction hash received",
        });
        setTimeout(() => setNotification(null), 5000);
        setIsProcessing(false);
        return;
      }

      console.log("✅ STEP 1 SUCCESS: WITHDRAWAL COMPLETED");
      console.log(`   Transaction Hash: ${withdrawResult.txHash}`);
      console.log(
        `   View on Aptoscan: https://aptoscan.com/txn/${withdrawResult.txHash}`
      );
      console.log("");

      // Update notification to show step 2
      setNotification({
        type: "processing",
        message: "Waiting for balance to update...",
        step: "transfer",
      });

      // Step 2: Wait for wallet balance to update and verify before transfer
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("⏳ STEP 2: WAITING FOR WALLET BALANCE TO UPDATE");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Withdrawal Transaction: ${withdrawResult.txHash}`);
      console.log(`   Expected Amount: ${amount} USDT`);
      console.log(`   Checking wallet balance...`);
      console.log("");

      // Retry mechanism: Check wallet balance with retries (API might have delay)
      let walletBalance = 0;
      let retryCount = 0;
      const maxRetries = 5;
      const retryDelay = 2000; // 2 seconds between retries

      while (retryCount < maxRetries) {
        const walletBalanceResult = await getWalletAccountBalance();

        if (
          walletBalanceResult.success &&
          walletBalanceResult.balance !== undefined
        ) {
          walletBalance = parseFloat(walletBalanceResult.balance);
          console.log(
            `   Attempt ${retryCount + 1}/${maxRetries}: Wallet Balance = ${walletBalance.toFixed(2)} USDT`
          );
          setWalletBalance(walletBalance.toFixed(2));

          // Check if balance is sufficient
          if (walletBalance >= amount) {
            console.log(
              `   ✅ Balance sufficient! Proceeding with transfer...`
            );
            console.log("");
            break;
          } else {
            console.log(
              `   ⚠️ Balance (${walletBalance.toFixed(2)} USDT) is less than required (${amount} USDT)`
            );
          }
        } else {
          console.log(
            `   Attempt ${retryCount + 1}/${maxRetries}: Failed to fetch balance - ${walletBalanceResult.error || "Unknown error"}`
          );
        }

        retryCount++;

        if (retryCount < maxRetries) {
          console.log(
            `   ⏳ Waiting ${retryDelay / 1000} seconds before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      // Final balance check before transfer
      if (walletBalance < amount) {
        console.error(
          "❌ STEP 2 FAILED: Insufficient wallet balance after withdrawal"
        );
        console.error(
          `   Required: ${amount} USDT, Available: ${walletBalance.toFixed(2)} USDT`
        );
        setNotification({
          type: "error",
          message: `Insufficient balance. Withdrawal completed but wallet balance (${walletBalance.toFixed(2)} USDT) is less than required (${amount} USDT). Please try again in a few moments.`,
        });
        setTimeout(() => setNotification(null), 8000);
        setIsProcessing(false);
        return;
      }

      // Update notification to show transfer in progress
      setNotification({
        type: "processing",
        message: "Transferring to destination address...",
        step: "transfer",
      });

      // Step 3: Transfer to destination address
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 STEP 3: TRANSFER TO DESTINATION ADDRESS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   From: Wallet Account`);
      console.log(`   To: ${withdrawAddress}`);
      console.log(`   Amount: ${amount} USDT`);
      console.log(`   Available Balance: ${walletBalance.toFixed(2)} USDT`);
      console.log("");

      const transferResult = await transferUSDTToAddress(
        withdrawAddress,
        amount
      );

      if (!transferResult.success) {
        console.error("❌ STEP 3 FAILED:", transferResult.error);
        setNotification({
          type: "error",
          message: `Transfer failed: ${transferResult.error || "Unknown error"}`,
        });
        setTimeout(() => setNotification(null), 5000);
        setIsProcessing(false);
        return;
      }

      if (!transferResult.txHash) {
        console.error("❌ No transaction hash received");
        setNotification({
          type: "error",
          message: "Transfer initiated but no transaction hash received",
        });
        setTimeout(() => setNotification(null), 5000);
        setIsProcessing(false);
        return;
      }

      console.log("✅ STEP 3 SUCCESS: TRANSFER COMPLETED");
      console.log(`   Transaction Hash: ${transferResult.txHash}`);
      console.log(
        `   View on Aptoscan: https://aptoscan.com/txn/${transferResult.txHash}`
      );
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ 2-WAY TRANSFER COMPLETED SUCCESSFULLY");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   From: Trading Account → Wallet → ${withdrawAddress}`);
      console.log(`   Total Amount: ${amount} USDT`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Show success notification with blushing/pink color
      setNotification({
        type: "success",
        message: `Success! ${amount} USDT transferred to ${withdrawAddress.slice(0, 6)}...${withdrawAddress.slice(-4)}`,
        txHash: transferResult.txHash,
      });

      // Reset form and refresh balance
      setWithdrawAmount("");
      setWithdrawAddress("");

      // Refresh trading balance
      if (onRefreshBalance && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          await onRefreshBalance();
          await fetchTradingBalance();
        } catch (error) {
          console.error("Error refreshing balance after withdrawal:", error);
        } finally {
          isRefreshingRef.current = false;
        }
      }

      // Auto-hide success notification after 8 seconds
      setTimeout(() => {
        setNotification(null);
      }, 8000);
    } catch (error: any) {
      console.error("❌ Error during 2-way transfer:", error);
      setNotification({
        type: "error",
        message: `Error: ${error.message || "Unknown error occurred"}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update trading balance when deposit tab is clicked
  useEffect(() => {
    if (activeTab === "deposit" && balance) {
      setTradingBalance(balance);
    }
  }, [activeTab, balance]);

  const quickAmounts = ["10", "50", "100", "500"];

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notification - Top Right Corner */}
      {notification && (
        <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-right duration-300">
          <div
            onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
            className={`rounded-lg p-4 shadow-2xl backdrop-blur-md border-2 min-w-[320px] max-w-[420px] ${
              notification.type === "success"
                ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/50 shadow-green-500/30"
                : notification.type === "error"
                  ? "bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-400/50 shadow-red-500/30"
                  : notification.type === "info"
                    ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/50 shadow-blue-500/30"
                    : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/50 shadow-blue-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.type === "success" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center">
                  <CheckCircle2 className="text-green-400" size={20} />
                </div>
              )}
              {notification.type === "error" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/30 flex items-center justify-center">
                  <AlertCircle className="text-red-400" size={20} />
                </div>
              )}
              {notification.type === "processing" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <Loader2 className="text-blue-400 animate-spin" size={20} />
                </div>
              )}
              {notification.type === "info" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <RefreshCw className="text-blue-400" size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    notification.type === "success"
                      ? "text-green-100"
                      : notification.type === "error"
                        ? "text-red-100"
                        : notification.type === "info"
                          ? "text-blue-100"
                          : "text-blue-100"
                  }`}
                >
                  {notification.message}
                </p>
                {notification.txHash && (
                  <a
                    href={`https://aptoscan.com/txn/${notification.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent event bubbling
                      // Link will open in new tab due to target="_blank"
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 transition-colors underline"
                  >
                    View Transaction
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {notification.type !== "processing" &&
                notification.type !== "info" && (
                  <button
                    onClick={() => setNotification(null)}
                    className="flex-shrink-0 text-slate-300 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                  >
                    <X size={16} />
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-modalSlideIn"
          style={{
            background: "rgba(6, 9, 19, 0.95)",
            border: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Wallet size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Wallet</h2>
                <p className="text-xs text-slate-400">Manage your funds</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Balance Display */}
          <div className="px-6 py-3 bg-slate-900/30 border-b border-slate-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">
                  Trading Account Balance
                </p>
                <div className="flex items-center gap-2">
                  <img
                    src="/usdt.png"
                    alt="USDT"
                    className="h-5 w-5 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <p className="text-2xl font-bold text-white">
                    {isLoadingBalance
                      ? "..."
                      : parseFloat(tradingBalance || "0").toFixed(2)}{" "}
                    USDT
                  </p>
                </div>
              </div>
              {/* Refresh Button - Fetches trading account balance */}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Prevent multiple simultaneous calls - strict guard
                  if (
                    isLoadingBalance ||
                    isRefreshingRef.current ||
                    isFetchingRef.current
                  ) {
                    return;
                  }

                  // Set flag immediately to prevent re-entry
                  isRefreshingRef.current = true;

                  try {
                    console.log(
                      "🔄 Refresh button clicked - Checking for deposits..."
                    );

                    // If on deposit tab, check for deposits and auto-transfer
                    if (activeTab === "deposit") {
                      await fetchWalletBalance(true); // Show notifications
                    } else {
                      // If on withdraw tab, just refresh trading balance
                      await fetchTradingBalance();
                      if (onRefreshBalance) {
                        await onRefreshBalance();
                      }
                    }
                  } catch (error: any) {
                    console.error("❌ Error refreshing:", error);
                    setNotification({
                      type: "error",
                      message: "Error refreshing balance",
                    });
                    setTimeout(() => setNotification(null), 4000);
                  } finally {
                    // Reset flag after a short delay
                    setTimeout(() => {
                      isRefreshingRef.current = false;
                    }, 500);
                  }
                }}
                disabled={isLoadingBalance || isRefreshingRef.current}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10 whitespace-nowrap"
                type="button"
              >
                {isLoadingBalance || isRefreshingRef.current ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={14} className="animate-spin" />
                    Checking...
                  </span>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800/50">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === "deposit"
                  ? "text-white border-b-2 border-blue-500 bg-blue-500/5"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              <ArrowDown
                size={18}
                className={activeTab === "deposit" ? "text-blue-400" : ""}
              />
              Deposit
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === "withdraw"
                  ? "text-white border-b-2 border-blue-500 bg-blue-500/5"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              <ArrowUp
                size={18}
                className={activeTab === "withdraw" ? "text-blue-400" : ""}
              />
              Withdraw
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === "deposit" ? (
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* Header Text */}
                <div className="text-center space-y-1">
                  <h3 className="text-base font-semibold text-white">
                    Deposit USDT
                  </h3>
                  <p className="text-xs text-slate-400">
                    Send USDT on Aptos network only
                  </p>
                </div>

                {/* QR Code Section */}
                {walletAddress ? (
                  <>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative inline-block">
                        <div className="p-2.5 bg-white rounded-2xl border border-slate-800/30 shadow-xl">
                          {/* QR Code */}
                          <QRCodeSVG
                            value={walletAddress}
                            size={160}
                            level="H"
                            includeMargin={false}
                            fgColor="#000000"
                            bgColor="#ffffff"
                          />
                        </div>
                        {/* Logo Overlay - Centered */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-white p-1.5 shadow-xl border border-slate-200">
                            <div className="relative w-full h-full">
                              {/* USDT Logo */}
                              <img
                                src="/usdt.png"
                                alt="USDT"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to Aptos logo if USDT logo fails
                                  const img = e.target as HTMLImageElement;
                                  img.src = "/aptos.png";
                                  img.onerror = () => {
                                    img.style.display = "none";
                                  };
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 text-center max-w-xs">
                        Scan QR code with your wallet app
                      </p>
                    </div>

                    {/* Wallet Address */}
                    <div className="w-full space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400 text-center">
                        Or copy wallet address
                      </label>
                      <div className="relative">
                        <div
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800/50 bg-slate-900/50"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-white break-all text-center">
                              {walletAddress}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(walletAddress)}
                            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white flex-shrink-0"
                            title="Copy address"
                          >
                            {copied ? (
                              <Check size={18} className="text-green-400" />
                            ) : (
                              <Copy size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-48 h-48 bg-slate-800/50 rounded-xl border border-slate-800/50 flex items-center justify-center">
                      <p className="text-sm text-slate-400">
                        Generating wallet address...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Withdraw Amount */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Amount to Withdraw (USDT)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={tradingBalance || balance}
                      className="w-full px-4 py-3 rounded-xl border border-slate-800/50 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500">
                      Available:{" "}
                      {parseFloat(tradingBalance || balance).toFixed(2)} USDT
                    </p>
                    <button
                      onClick={() =>
                        setWithdrawAmount(tradingBalance || balance)
                      }
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Max
                    </button>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2 mt-3">
                    {quickAmounts.map((amount) => {
                      const numAmount = parseFloat(amount);
                      const numBalance = parseFloat(tradingBalance || balance);
                      const isDisabled = numAmount > numBalance;
                      return (
                        <button
                          key={amount}
                          onClick={() =>
                            !isDisabled && setWithdrawAmount(amount)
                          }
                          disabled={isDisabled}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white border border-slate-800/50 hover:border-blue-500/50 bg-slate-900/30 hover:bg-blue-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ${amount}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Withdraw Address */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Withdraw to Address
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-800/50 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Enter the Aptos wallet address to receive funds (must start
                    with 0x)
                  </p>
                </div>

                {/* Withdraw Button */}
                <button
                  onClick={handleWithdraw}
                  disabled={
                    isProcessing ||
                    !withdrawAmount ||
                    parseFloat(withdrawAmount) <= 0 ||
                    parseFloat(withdrawAmount) >
                      parseFloat(tradingBalance || balance) ||
                    !withdrawAddress ||
                    !withdrawAddress.trim() ||
                    !withdrawAddress.startsWith("0x")
                  }
                  className="w-full px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUp size={18} />
                      Withdraw USDT
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
