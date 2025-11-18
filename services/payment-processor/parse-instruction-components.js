const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const PaymentMessages = require('@app/messages/payment');

/**
 * Normalizes instruction and parses components using string manipulation.
 * Throws SY01, SY02, SY03 errors using throwAppError.
 */
function parseInstructionComponents(instruction) {
  // Normalize whitespace
  let normalized = instruction.trim();
  while (normalized.includes('  ')) {
    normalized = normalized.replace('  ', ' ');
  }

  const tokensOriginal = normalized.split(' ');
  const tokens = tokensOriginal.map((t) => t.toLowerCase());

  const [rawTxnType, rawAmount, rawCurrency] = tokensOriginal;
  const txnType = rawTxnType ? rawTxnType.toUpperCase() : null;

  const details = {
    txnType,
    amount: null,
    currency: null,
    debitId: null,
    creditId: null,
    executeBy: null,
  };

  // SY01: Validate transaction type keyword
  if (!['DEBIT', 'CREDIT'].includes(txnType)) {
    throwAppError(PaymentMessages.MISSING_KEYWORD, ERROR_CODE.INVLDDATA, { context: 'SY01' });
  }

  // Determine keyword order + account index depending on transaction type
  const kws =
    txnType === 'DEBIT'
      ? ['debit', 'from', 'account', 'for', 'credit', 'to', 'account']
      : ['credit', 'to', 'account', 'for', 'debit', 'from', 'account'];

  const accountIndices = [5, 10];

  // SY01: Minimum valid length
  if (tokens.length < accountIndices[1] + 1) {
    throwAppError(PaymentMessages.MISSING_KEYWORD, ERROR_CODE.INVLDDATA, { context: 'SY01' });
  }

  // Validate ordered presence of required keywords (SY02)
  let lastIndex = -1;
  let searchFrom = 0;

  kws.forEach((keyword) => {
    const currentIndex = tokens.indexOf(keyword, searchFrom);

    if (currentIndex === -1) {
      throwAppError(PaymentMessages.MISSING_KEYWORD, ERROR_CODE.INVLDDATA, { context: 'SY01' });
    }
    if (currentIndex <= lastIndex) {
      throwAppError(
        PaymentMessages.INVALID_KEYWORD_ORDER.replace('{{type}}', txnType),
        ERROR_CODE.INVLDDATA,
        { context: 'SY02' }
      );
    }

    lastIndex = currentIndex;
    searchFrom = currentIndex + 1;
  });

  // Extract IDs
  const [debitAccountToken, creditAccountToken] = [
    tokensOriginal[accountIndices[0]],
    tokensOriginal[accountIndices[1]],
  ];

  if (txnType === 'DEBIT') {
    details.debitId = debitAccountToken;
    details.creditId = creditAccountToken;
  } else {
    details.creditId = debitAccountToken;
    details.debitId = creditAccountToken;
  }

  // Parse and validate Amount (AM01)
  const amount = Number(rawAmount);
  if (Number.isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
    throwAppError(
      PaymentMessages.INVALID_AMOUNT.replace('{{amount}}', rawAmount),
      ERROR_CODE.INVLDDATA,
      { context: 'AM01' }
    );
  }

  details.amount = amount;
  details.currency = rawCurrency.toUpperCase();

  // Extract and validate date (DT01)
  const onIndex = tokens.indexOf('on', lastIndex + 1);
  if (onIndex !== -1) {
    const dateStr = tokens[onIndex + 1];
    const validFormat =
      dateStr &&
      dateStr.length === 10 &&
      dateStr.indexOf('-') === 4 &&
      dateStr.lastIndexOf('-') === 7;

    if (!validFormat) {
      throwAppError(
        PaymentMessages.INVALID_DATE_FORMAT.replace('{{date}}', dateStr || 'N/A'),
        ERROR_CODE.INVLDDATA,
        { context: 'DT01' }
      );
    }

    details.executeBy = dateStr;
  }

  // Validate account IDs characters (AC04)
  const invalidChars = [
    '#',
    '$',
    '%',
    '&',
    '*',
    '(',
    ')',
    '+',
    '=',
    '[',
    ']',
    '{',
    '}',
    '|',
    '\\',
    ':',
    ';',
    "'",
    '"',
    '<',
    '>',
    '?',
    ',',
    '`',
    '~',
    '!',
  ];

  invalidChars.forEach((char) => {
    if (details.debitId.includes(char)) {
      throwAppError(
        PaymentMessages.INVALID_ACCOUNT_ID.replace('{{accountId}}', details.debitId),
        ERROR_CODE.INVLDDATA,
        { context: 'AC04' }
      );
    }
    if (details.creditId.includes(char)) {
      throwAppError(
        PaymentMessages.INVALID_ACCOUNT_ID.replace('{{accountId}}', details.creditId),
        ERROR_CODE.INVLDDATA,
        { context: 'AC04' }
      );
    }
  });

  return details;
}

module.exports = parseInstructionComponents;
