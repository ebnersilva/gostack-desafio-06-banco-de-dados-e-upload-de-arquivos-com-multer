import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    let categorySaved = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!categorySaved) {
      categorySaved = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(categorySaved);
    }

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('You did not have a balance for this operation.');
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categorySaved.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
