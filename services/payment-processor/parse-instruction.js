const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const PaymentMessages = require('@app/messages/payment');
const parseInstructionComponents = require('./parse-instruction-components');
const validateBusinessRules = require('./validate-business-rules');
const executeTransaction = require('./execute-transaction');

// VSL Validation Spec
const spec = `root {
  accounts[] {
    id string<trim|minLength:1|maxLength:50>
    balance number<min:0>
    currency string<trim|uppercase|length:3>
  }
  instruction string<trim|minLength:1>
}`;
const parsedSpec = validator.parse(spec);

async function parseInstruction(serviceData, options = {}) {
  let response;

  // Validate input data
  const data = validator.validate(serviceData, parsedSpec);

  // Initialize Response Object
  let transactionDetails = {
    type: null,
    amount: null,
    currency: null,
    debit_account: null,
    credit_account: null,
    execute_by: null,
    status: 'failed',
    status_reason: PaymentMessages.MALFORMED_INSTRUCTION,
    status_code: 'SY03',
    accounts: [],
  };

  try {
    // Parse and Basic Syntax Validation
    const { txnType, amount, currency, debitId, creditId, executeBy, debitAccount, creditAccount } =
      parseInstructionComponents(data.instruction);

    // Update details with parsed values
    Object.assign(transactionDetails, {
      type: txnType,
      amount,
      currency,
      debit_account: debitId,
      credit_account: creditId,
      execute_by: executeBy,
      status_reason: PaymentMessages.TRANSACTION_SUCCESSFUL,
      status_code: 'AP00',
    });

    // Business Rule Validation
    transactionDetails = validateBusinessRules(transactionDetails, data.accounts);

    // Execute Transaction
    const execution = executeTransaction(transactionDetails, data.accounts);

    response = {
      type: execution.type || transactionDetails.type,
      amount: execution.amount || transactionDetails.amount,
      currency: execution.currency || transactionDetails.currency,
      debit_account: execution.debit_account || transactionDetails.debit_account,
      credit_account: execution.credit_account || transactionDetails.credit_account,
      execute_by: execution.execute_by || transactionDetails.execute_by,
      status: execution.status,
      status_reason: execution.statusReason,
      status_code: execution.statusCode,
      accounts: execution.accounts,
    };
  } catch (appError) {
    if (appError.isApplicationError) {
      const accountsBefore = data.accounts.map((acc) => ({
        id: acc.id,
        balance: acc.balance,
        balance_before: acc.balance,
        currency: acc.currency,
      }));

      const relevantAccounts = accountsBefore.filter(
        (acc) =>
          acc.id === transactionDetails.debit_account ||
          acc.id === transactionDetails.credit_account
      );

      const finalAccounts =
        transactionDetails.debit_account && transactionDetails.credit_account
          ? relevantAccounts
          : [];

      response = {
        type: transactionDetails.type,
        amount: transactionDetails.amount,
        currency: transactionDetails.currency,
        debit_account: transactionDetails.debit_account,
        credit_account: transactionDetails.credit_account,
        execute_by: transactionDetails.execute_by,
        status: 'failed',
        status_reason: appError.message,
        status_code: appError.context,
        accounts: finalAccounts,
      };
    } else {
      appLogger.errorX(appError, 'parse-instruction-system-error');
      throw appError;
    }
  }

  return response;
}

module.exports = parseInstruction;
