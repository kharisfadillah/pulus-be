import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { TransType } from 'generated/prisma/client';

export class CreateTransactionDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(TransType)
  type: TransType;

  @IsString()
  @IsNotEmpty()
  fromWalletId: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  toWalletId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}
