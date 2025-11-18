const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const PaymentMessages = require('@app/messages/payment');

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];
const SUPPORTED_CURRENCIES_SET = new Set(SUPPORTED_CURRENCIES);

/**
 * Validates business rules against the provided accounts.
 * Throws CU01, AC01, AC02, AC03 errors using throwAppError.
 */
function validateBusinessRules(details, accounts) {
  const {
    amount,
    currency,
    debit_account: debitAccountId,
    credit_account: creditAccountId,
  } = details;

  // AC02: Same account check
  if (debitAccountId === creditAccountId) {
    throwAppError(PaymentMessages.SAME_ACCOUNT_ERROR, ERROR_CODE.DUPLRCRD, { context: 'AC02' });
  }

  // Find accounts
  const debitAccount = accounts.find(
    (acc) => acc.id.toLowerCase() === debitAccountId.toLowerCase()
  );
  const creditAccount = accounts.find(
    (acc) => acc.id.toLowerCase() === creditAccountId.toLowerCase()
  );

  // AC03: Account existence check
  if (!debitAccount) {
    throwAppError(
      PaymentMessages.ACCOUNT_NOT_FOUND.replace('{{accountId}}', debitAccountId),
      ERROR_CODE.NOTFOUND,
      { context: 'AC03' }
    );
  }
  if (!creditAccount) {
    throwAppError(
      PaymentMessages.ACCOUNT_NOT_FOUND.replace('{{accountId}}', creditAccountId),
      ERROR_CODE.NOTFOUND,
      { context: 'AC03' }
    );
  }

  // CU02: Unsupported currency check
  if (!SUPPORTED_CURRENCIES_SET.has(currency)) {
    throwAppError(
      PaymentMessages.UNSUPPORTED_CURRENCY.replace('{{currency}}', currency),
      ERROR_CODE.INVLDDATA,
      { context: 'CU02' }
    );
  }

  // CU01: Currency mismatch check
  if (debitAccount.currency !== currency || creditAccount.currency !== currency) {
    throwAppError(
      PaymentMessages.CURRENCY_MISMATCH.replace('{{txnCurrency}}', currency),
      ERROR_CODE.INVLDDATA,
      { context: 'CU01' }
    );
  }

  // AC01: Insufficient funds check
  if (debitAccount.balance < amount) {
    const shortage = parseInt(amount, 10) - parseInt(debitAccount.balance, 10);

    throwAppError(
      PaymentMessages.INSUFFICIENT_FUNDS.replace('{{debitId}}', debitAccountId)
        .replace('{{balance}}', debitAccount.balance)
        .replace('{{currency}}', currency)
        .replace('{{amount}}', shortage),
      ERROR_CODE.LIMITERR,
      { context: 'AC01' }
    );
  }

  return {
    ...details,
    debitAccount,
    creditAccount,
  };
}

module.exports = validateBusinessRules;
