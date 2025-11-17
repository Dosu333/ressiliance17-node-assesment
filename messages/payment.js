const PaymentMessages = {
    // Parsing & Syntax Errors
    INVALID_AMOUNT: 'Amount must be a positive integer, received: {{amount}}.', // AM01
    INVALID_ACCOUNT_ID: 'Invalid account ID format: {{accountId}} contains unsupported characters.', // AC04
    INVALID_DATE_FORMAT: 'Date must be in YYYY-MM-DD format, received: {{date}}.', // DT01
    MISSING_KEYWORD: 'Missing required keyword in instruction.', // SY01
    INVALID_KEYWORD_ORDER: 'Keywords are in the wrong order for transaction type: {{type}}.', // SY02
    MALFORMED_INSTRUCTION: 'Malformed instruction: unable to parse the required amount or currency.', // SY03
  
    // Business Rule Errors
    CURRENCY_MISMATCH: 'Transaction currency ({{txnCurrency}}) does not match one or more account currencies.', // CU01
    UNSUPPORTED_CURRENCY: 'Unsupported currency: {{currency}}. Only NGN, USD, GBP, and GHS are supported.', // CU02
    INSUFFICIENT_FUNDS: 'Insufficient funds in debit account {{debitId}}: has {{balance}} {{currency}}, needs {{amount}}.', // AC01
    SAME_ACCOUNT_ERROR: 'Debit and credit accounts cannot be the same.', // AC02
    ACCOUNT_NOT_FOUND: 'Account with ID {{accountId}} not found in the provided account list.', // AC03
    
    // Status Codes
    TRANSACTION_SUCCESSFUL: 'Transaction executed successfully.', // AP00
    TRANSACTION_PENDING: 'Transaction scheduled for future execution on {{executeBy}}.', // AP02
  };
  
  module.exports = PaymentMessages;