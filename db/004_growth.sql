-- Marketing campaigns and SmartPoints loyalty program.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN ('discount','bogo','bundle','happy_hour','flash_sale')),
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','ended')),
  discount_value numeric(12,2),
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_operator ON public.campaigns(operator_id);

-- ponytail: target_id is a polymorphic uuid (no FK) since it can point to a
-- machine, location, or product depending on target_type. Enforcing referential
-- integrity across three tables needs a trigger or three nullable FK columns;
-- neither is worth it for a demo-scale campaign targeting list.
CREATE TABLE IF NOT EXISTS public.campaign_targets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  campaign_id   uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  target_type   text NOT NULL CHECK (target_type IN ('machine','location','product')),
  target_id     uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_operator ON public.campaign_targets(operator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign ON public.campaign_targets(campaign_id);

CREATE TABLE IF NOT EXISTS public.loyalty_program (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id       uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name              text NOT NULL DEFAULT 'SmartPoints',
  points_per_dollar numeric(12,2) NOT NULL DEFAULT 1,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_program_operator ON public.loyalty_program(operator_id);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id         uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  loyalty_program_id  uuid NOT NULL REFERENCES public.loyalty_program(id) ON DELETE CASCADE,
  name                text NOT NULL,
  points_cost         int NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_operator ON public.loyalty_rewards(operator_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_program ON public.loyalty_rewards(loyalty_program_id);

CREATE TABLE IF NOT EXISTS public.loyalty_members (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id         uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  loyalty_program_id  uuid NOT NULL REFERENCES public.loyalty_program(id) ON DELETE CASCADE,
  full_name           text,
  email               text,
  phone               text,
  points_balance      int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_operator ON public.loyalty_members(operator_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_program ON public.loyalty_members(loyalty_program_id);
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_members_program_email_key ON public.loyalty_members(loyalty_program_id, email);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id        uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  loyalty_member_id  uuid NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  loyalty_reward_id  uuid NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
  points_spent       int NOT NULL DEFAULT 0,
  redeemed_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_operator ON public.loyalty_redemptions(operator_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_member ON public.loyalty_redemptions(loyalty_member_id);
