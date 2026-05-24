"use client";

import { useEffect, useState } from "react";
import {
  CreditCard, Check, Zap, Crown, Sparkles, Shield,
  ArrowRight, Loader2, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  sort_order: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  plans: Plan;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_ICONS: Record<string, any> = {
  free: Shield,
  starter: Zap,
  pro: Sparkles,
  pro_plus: Crown,
  pro_max: Crown,
};

const PLAN_COLORS: Record<string, string> = {
  free: "var(--t2)",
  starter: "#22c55e",
  pro: "#6366f1",
  pro_plus: "#a855f7",
  pro_max: "#f59e0b",
};

export default function BillingPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const [plansRes, subRes, usageRes] = await Promise.all([
        apiFetch("/billing/plans", session.access_token),
        apiFetch("/billing/subscription", session.access_token),
        apiFetch("/billing/usage", session.access_token),
      ]);

      if (plansRes.ok) setPlans(await plansRes.json());
      if (subRes.ok) setSubscription(await subRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUpgrading(planId);
    setError("");

    try {
      const res = await apiFetch("/billing/create-order", session.access_token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, promo_code: promoCode || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to create order");
        setUpgrading(null);
        return;
      }

      const order = await res.json();

      if (order.free) {
        // 100% discount — already activated
        await fetchData();
        setUpgrading(null);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Ostrich",
        description: `Upgrade to ${planId.replace("_", " ")}`,
        order_id: order.order_id,
        handler: async (response: any) => {
          // Verify payment
          const verifyRes = await apiFetch("/billing/verify-payment", session.access_token, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            }),
          });

          if (verifyRes.ok) {
            await fetchData();
          } else {
            setError("Payment verification failed. Contact support.");
          }
          setUpgrading(null);
        },
        modal: {
          ondismiss: () => setUpgrading(null),
        },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  const currentPlan = subscription?.plan_id || "free";
  const currentPlanData = plans.find((p) => p.id === currentPlan);
  const brainLimit = currentPlanData?.limits?.brain_searches_per_week ?? 5;
  const brainUsed = usage.brain_searches_per_week || 0;
  const notesLimit = currentPlanData?.limits?.ai_notes_per_week ?? 5;
  const notesUsed = usage.ai_notes_per_week || 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-[24px] font-bold tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[var(--accent)]" />
            Billing & Plans
          </h1>
          <p className="text-[13px] text-[var(--t2)] mt-1">
            Manage your subscription and usage
          </p>
        </div>

        {/* Current Plan Card */}
        <div className="p-5 rounded-xl border border-[var(--brd)] bg-[var(--bg-s)] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--t3)]">Current Plan</p>
              <h2 className="font-heading text-[22px] font-bold mt-1" style={{ color: PLAN_COLORS[currentPlan] }}>
                {currentPlanData?.name || "Free"}
              </h2>
              {subscription?.current_period_end && (
                <p className="text-[12px] text-[var(--t3)] mt-1">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Usage bars */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-[var(--t2)] font-medium">Brain Searches</p>
                <p className="text-[12px] font-bold">
                  {brainUsed} / {brainLimit === -1 ? "∞" : brainLimit}
                </p>
              </div>
              {brainLimit !== -1 && (
                <div className="w-full h-2 rounded-full bg-[var(--bg-s2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (brainUsed / brainLimit) * 100)}%`,
                      background: brainUsed >= brainLimit ? "var(--danger)" : "var(--accent)",
                    }}
                  />
                </div>
              )}
              <p className="text-[10px] text-[var(--t3)] mt-1">AI Brain chat & voice this week</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-[var(--t2)] font-medium">AI Notes</p>
                <p className="text-[12px] font-bold">
                  {notesUsed} / {notesLimit === -1 ? "∞" : notesLimit}
                </p>
              </div>
              {notesLimit !== -1 && (
                <div className="w-full h-2 rounded-full bg-[var(--bg-s2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (notesUsed / notesLimit) * 100)}%`,
                      background: notesUsed >= notesLimit ? "var(--danger)" : "#22c55e",
                    }}
                  />
                </div>
              )}
              <p className="text-[10px] text-[var(--t3)] mt-1">AI generation inside notes this week</p>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="Promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="px-3 py-2 text-[13px] rounded-lg border border-[var(--brd2)] bg-[var(--bg)] text-[var(--t)] outline-none focus:border-[var(--accent)] w-48"
          />
          {promoCode && (
            <span className="text-[11px] text-[var(--t3)]">Will be applied at checkout</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-[13px] text-red-500">{error}</span>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || Shield;
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = plan.sort_order < (currentPlanData?.sort_order ?? 0);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]/20"
                    : "border-[var(--brd)] bg-[var(--bg-s)] hover:border-[var(--brd2)]"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--accent)] text-white rounded-full">
                    Current
                  </span>
                )}

                <Icon className="w-5 h-5 mb-2" style={{ color: PLAN_COLORS[plan.id] }} />
                <h3 className="font-heading text-[14px] font-bold">{plan.name}</h3>
                <div className="mt-1 mb-3">
                  <span className="font-heading text-[22px] font-extrabold">
                    ₹{plan.price_monthly}
                  </span>
                  {plan.price_monthly > 0 && (
                    <span className="text-[11px] text-[var(--t3)]">/mo</span>
                  )}
                </div>

                <ul className="flex-1 space-y-1.5 mb-4">
                  {plan.limits.brain_searches_per_week !== undefined && (
                    <li className="flex items-start gap-1.5 text-[11px] text-[var(--t2)]">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      {plan.limits.brain_searches_per_week === -1 ? "Unlimited" : plan.limits.brain_searches_per_week} Brain/week
                    </li>
                  )}
                  {plan.limits.ai_notes_per_week !== undefined && (
                    <li className="flex items-start gap-1.5 text-[11px] text-[var(--t2)]">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      {plan.limits.ai_notes_per_week === -1 ? "Unlimited" : plan.limits.ai_notes_per_week} AI Notes/week
                    </li>
                  )}
                  {plan.limits.notes_limit !== undefined && (
                    <li className="flex items-start gap-1.5 text-[11px] text-[var(--t2)]">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      {plan.limits.notes_limit === -1 ? "Unlimited" : plan.limits.notes_limit} notes
                    </li>
                  )}
                  {plan.limits.vault_uploads !== undefined && (
                    <li className="flex items-start gap-1.5 text-[11px] text-[var(--t2)]">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      {plan.limits.vault_uploads === -1 ? "Unlimited" : plan.limits.vault_uploads} uploads
                    </li>
                  )}
                  {plan.features.voice && (
                    <li className="flex items-start gap-1.5 text-[11px] text-[var(--t2)]">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      Voice mode
                    </li>
                  )}
                  {plan.features.memory && (
                    <li className="flex items-start gap-1.5 text-[11px] text-[var(--t2)]">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      Memory
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <span className="text-center py-2 text-[12px] font-medium text-[var(--t3)]">
                    Active
                  </span>
                ) : isDowngrade ? (
                  <span className="text-center py-2 text-[12px] font-medium text-[var(--t3)]">
                    —
                  </span>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading !== null}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg text-[12px] font-semibold bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] transition-colors disabled:opacity-50"
                  >
                    {upgrading === plan.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>Upgrade <ArrowRight className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
