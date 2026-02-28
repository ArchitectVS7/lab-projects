import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { billingApi } from '../lib/api';
import type { PlanInfo } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { CreditCard, Check, Zap, Users, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';

function PlanCard({
  plan,
  currentPlan,
  onSelect,
  isLoading,
}: {
  plan: PlanInfo;
  currentPlan: string;
  onSelect: (priceId: string) => void;
  isLoading: boolean;
}) {
  const isCurrent = plan.tier === currentPlan;
  const isUpgrade = !isCurrent && plan.tier !== 'FREE';
  const isPro = plan.tier === 'PRO';

  return (
    <div
      className={`relative rounded-xl border-2 p-6 transition-all ${
        isPro
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
          : 'border-gray-200 dark:border-gray-700'
      } ${isCurrent ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-semibold text-white">
          Most Popular
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
        <div className="mt-2">
          {plan.tier === 'FREE' ? (
            <span className="text-3xl font-bold text-gray-900 dark:text-white">$0</span>
          ) : isPro ? (
            <div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.monthlyPrice}</span>
              <span className="text-gray-500 dark:text-gray-400">/month</span>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                or ${plan.annualPrice}/year (save 25%)
              </div>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.monthlyPricePerSeat}</span>
              <span className="text-gray-500 dark:text-gray-400">/user/month</span>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                min {plan.minSeats} seats
              </div>
            </div>
          )}
        </div>
      </div>

      <ul className="mb-6 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="rounded-lg bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Current Plan
        </div>
      ) : isUpgrade && plan.prices?.monthly ? (
        <button
          onClick={() => onSelect(plan.prices!.monthly)}
          disabled={isLoading || !plan.prices?.monthly}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </button>
      ) : null}
    </div>
  );
}

function UsageMeter({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percentage = limit === 0 ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage > 80;

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`text-sm font-semibold ${isNearLimit ? 'text-orange-500' : 'text-gray-900 dark:text-white'}`}>
          {used} / {limit === Infinity ? 'Unlimited' : limit}
        </span>
      </div>
      {limit !== Infinity && limit > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const { data: plans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
  });

  const { data: status } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => billingApi.getStatus(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => billingApi.createCheckout({ priceId }),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      setCheckoutLoading(false);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.openPortal(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleSelectPlan = (priceId: string) => {
    setCheckoutLoading(true);
    checkoutMutation.mutate(priceId);
  };

  const currentPlan = status?.plan || user?.plan || 'FREE';

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Plans</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your subscription and usage
        </p>
      </div>

      {/* Success/Cancel banners */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span className="font-medium">Subscription activated! Welcome to TaskMan Pro.</span>
          </div>
        </div>
      )}
      {canceled && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          Checkout was canceled. No charges were made.
        </div>
      )}

      {/* Current subscription status */}
      {status?.subscription && (
        <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {status.subscription.planTier} Plan
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {status.subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews ${new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}`}
                  {status.subscription.seats > 1 && ` · ${status.subscription.seats} seats`}
                </p>
              </div>
            </div>
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {portalMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Manage Subscription <ExternalLink className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Usage meters */}
      {status && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Usage This Period</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageMeter
              label="AI Agent Delegations"
              used={status.usage.ai_delegation.used}
              limit={status.usage.ai_delegation.limit}
            />
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans?.plans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={handleSelectPlan}
              isLoading={checkoutLoading}
            />
          ))}
        </div>
      </div>

      {/* Feature comparison teaser */}
      {currentPlan === 'FREE' && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold">Unlock AI Agents</h3>
              <p className="text-indigo-100">
                Delegate tasks to AI agents that research, write, code, and analyze for you.
                Upgrade to Pro to get 50 delegations per month.
              </p>
            </div>
          </div>
        </div>
      )}

      {currentPlan === 'PRO' && (
        <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold">Scale with Team</h3>
              <p className="text-purple-100">
                Get a creator dashboard, critical path visualization, and 200 shared AI delegations.
                Perfect for small teams.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
