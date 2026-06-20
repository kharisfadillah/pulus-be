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

export class UpdateTransactionDto {
  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  date?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransType)
  @IsOptional()
  type?: TransType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  fromWalletId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  toWalletId?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;
}
