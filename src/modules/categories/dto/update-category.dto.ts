import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TransType } from 'generated/prisma/client';

export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(TransType)
  @IsOptional()
  type?: TransType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  color?: string;
}
