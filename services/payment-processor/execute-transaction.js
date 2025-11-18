const PaymentMessages = require('@app/messages/payment');

/**
 * Executes the transaction or marks it as pending based on the execution date.
 * Returns the final status and updated account list.
 */
function executeTransaction(details, originalAccounts) {
  const result = {
    status: 'successful',
    statusCode: 'AP00',
    statusReason: PaymentMessages.TRANSACTION_SUCCESSFUL,
    accounts: [],
  };
  const { amount, execute_by: executeBy, debitAccount, creditAccount } = details;

  let isPending = false;
  if (executeBy) {
    // Date comparison
    const currentDate = new Date();
    const currentUtcDate = new Date(
      Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    );
    const execDate = new Date(executeBy);
    const execUtcDate = new Date(
      Date.UTC(execDate.getFullYear(), execDate.getMonth(), execDate.getDate())
    );

    if (execUtcDate > currentUtcDate) {
      isPending = true;
      result.status = 'pending';
      result.statusCode = 'AP02';
      result.statusReason = PaymentMessages.TRANSACTION_PENDING.replace('{{executeBy}}', executeBy);
    }
  }

  // Create the final accounts array with balance_before
  result.accounts = originalAccounts
    .map((acc) => {
      const balanceBefore = acc.balance;
      let finalBalance = balanceBefore;

      if (!isPending) {
        if (acc.id === debitAccount.id) {
          finalBalance -= amount;
        } else if (acc.id === creditAccount.id) {
          finalBalance += amount;
        }
      }

      return {
        id: acc.id,
        balance: finalBalance,
        balance_before: balanceBefore,
        currency: acc.currency,
      };
    })
    .filter((acc) => acc.id === debitAccount.id || acc.id === creditAccount.id);

  return result;
}

module.exports = executeTransaction;
