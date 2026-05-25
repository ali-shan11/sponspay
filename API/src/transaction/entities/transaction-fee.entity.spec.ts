import { Transaction } from './transaction.entity';
import { TransactionFee } from './transaction-fee.entity';

describe('TransactionFee Entity', () => {
  let transaction: Transaction;
  let fee: TransactionFee;

  beforeEach(() => {
    transaction = new Transaction();
    transaction.id = 'txn-123';
    transaction.amount = '100.00';
    transaction.usdEstimatedValue = '120.00';
    transaction.totalFees = '0.00';
    transaction.totalPayout = '100.00';

    fee = new TransactionFee();
    fee.id = 'fee-1';
    fee.transaction = transaction;
    fee.percentage = '2.50';
    fee.amount = '2.50';
    fee.usdEstimatedValue = '3.00';
    fee.chargedAt = new Date('2024-01-01T00:00:00Z');
  });

  it('should be defined', () => {
    expect(fee).toBeDefined();
  });

  it('should reference a transaction', () => {
    expect(fee.transaction).toBe(transaction);
    expect(fee.transaction.id).toBe('txn-123');
  });

  it('should aggregate fees into transaction totalFees and compute totalPayout', () => {
    const fee2 = new TransactionFee();
    fee2.id = 'fee-2';
    fee2.transaction = transaction;
    fee2.percentage = '1.50';
    fee2.amount = '1.50';
    fee2.usdEstimatedValue = '1.80';
    fee2.chargedAt = new Date('2024-01-02T00:00:00Z');

    transaction.fees = [fee, fee2];
    const total = (parseFloat(fee.amount) + parseFloat(fee2.amount)).toFixed(2);
    transaction.totalFees = total;
    transaction.totalPayout = (
      parseFloat(transaction.amount) - parseFloat(total)
    ).toFixed(2);

    expect(transaction.totalFees).toBe('4.00');
    expect(transaction.totalPayout).toBe('96.00');
  });
});
