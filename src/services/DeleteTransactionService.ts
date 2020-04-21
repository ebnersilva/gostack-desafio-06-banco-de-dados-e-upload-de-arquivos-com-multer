import { getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

// import AppError from '../errors/AppError';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getRepository(Transaction);

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
