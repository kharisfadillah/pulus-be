import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { TransType } from 'generated/prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TransType)
  type: TransType;

  @IsString()
  @IsNotEmpty()
  icon: string;

  @IsString()
  @IsNotEmpty()
  color: string;
}
