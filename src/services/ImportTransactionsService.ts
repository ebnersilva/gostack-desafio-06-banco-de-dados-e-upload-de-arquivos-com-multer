import { getRepository, getCustomRepository, In } from 'typeorm';
import fs from 'fs';
import csvParse from 'csv-parse';

import uploadConfig from '../config/upload';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  fileName: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const contactsReadStream = fs.createReadStream(
      `${uploadConfig.directory}/${fileName}`,
    );

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // Capturamos todas as categorias já existente no banco de dados
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    // Recuperamos somente o título das categorias
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // Criamos um array somente com as categorias que ainda não estão no banco de dados
    const addCategoryTitles = categories
      .filter(categoryCSV => !existentCategoriesTitles.includes(categoryCSV))
      .filter((value, index, self) => self.indexOf(value) === index);

    // Criamos o objeto para do typeorm para criação dos dados no BD
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(`${uploadConfig.directory}/${fileName}`);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
