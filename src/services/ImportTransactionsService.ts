import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parse';
import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  filename: string;
}
class ImportTransactionsService {
  async getDataFromCSV(filePath: string): Promise<Array<string[]>> {
    const lines = [] as Array<string[]>;

    const csvStream = fs.createReadStream(filePath, 'utf-8');
    const parseStream = csvParser({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parsedCSV = csvStream.pipe(parseStream);

    parsedCSV.on('data', async line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parsedCSV.on('end', resolve);
    });

    return lines;
  }

  async execute({ filename }: Request): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.directory, filename);
    const data = await this.getDataFromCSV(filePath);

    const createTransaction = new CreateTransactionService();
    const transactions = [] as Transaction[];

    for (const row of data) {
      const [title, type, value, category] = row;

      const transaction = await createTransaction.execute({
        title,
        type: type as 'income' | 'outcome',
        value: Number(value),
        categoryTitle: category,
      });

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
