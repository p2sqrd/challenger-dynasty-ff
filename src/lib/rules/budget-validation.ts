export const DEFAULT_MIN_REMAINING_BUDGET = 125;
export const DEFAULT_MAX_REMAINING_BUDGET = 275;

export interface BudgetValidationInput {
  startingBudget: number;
  totalKeeperSpend: number;
  minRemaining?: number;
  maxRemaining?: number;
}

export interface BudgetValidationResult {
  ok: boolean;
  remainingBudget: number;
  violations: string[];
}

/** Spec section 4: total keeper spend must leave next season's draft budget
 * between $125 and $275. Callers surface violations as warnings on the
 * selection screen rather than silently rejecting — the caller decides
 * whether `ok: false` blocks submission. */
export function validateKeeperBudget(
  input: BudgetValidationInput
): BudgetValidationResult {
  const {
    startingBudget,
    totalKeeperSpend,
    minRemaining = DEFAULT_MIN_REMAINING_BUDGET,
    maxRemaining = DEFAULT_MAX_REMAINING_BUDGET,
  } = input;

  const remainingBudget = startingBudget - totalKeeperSpend;
  const violations: string[] = [];

  if (remainingBudget < minRemaining) {
    violations.push(
      `Keeping these players leaves only $${remainingBudget} for next season's draft, below the $${minRemaining} floor.`
    );
  }
  if (remainingBudget > maxRemaining) {
    violations.push(
      `Keeping these players leaves $${remainingBudget} for next season's draft, above the $${maxRemaining} ceiling.`
    );
  }

  return { ok: violations.length === 0, remainingBudget, violations };
}

export interface KeeperCountValidationInput {
  keeperCount: number;
  maxKeepers: number;
}

export interface KeeperCountValidationResult {
  ok: boolean;
  violations: string[];
}

/** Spec section 6: submission is blocked if the selection exceeds roster
 * slots available for keepers. */
export function validateKeeperCount(
  input: KeeperCountValidationInput
): KeeperCountValidationResult {
  const { keeperCount, maxKeepers } = input;
  const violations: string[] = [];

  if (keeperCount > maxKeepers) {
    violations.push(
      `${keeperCount} keepers selected, but only ${maxKeepers} roster slots are allowed.`
    );
  }

  return { ok: violations.length === 0, violations };
}
