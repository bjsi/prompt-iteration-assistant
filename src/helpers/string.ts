import { compile } from "json-schema-to-typescript";
import { ZodType } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

export const capitalizeFirst = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const toCamelCase = (str: string) => {
  return str
    .replace(/\s(.)/g, function ($1) {
      return $1.toUpperCase();
    })
    .replace(/\s/g, "")
    .replace(/^(.)/, function ($1) {
      return $1.toLowerCase();
    });
};

export const fromCamelCase = (str: string) => {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, function (str) {
      return str.toUpperCase();
    })
    .trim();
};

export const truncate = (str: string, n: number) => {
  return str.length > n ? str.substring(0, n - 1) + "..." : str;
};

export const zodSchemaToInterface = async (args: {
  schema: ZodType;
  name?: string;
}) => {
  const jsonSchema = zodToJsonSchema(args.schema);
  const tsInterface = await compile(
    // @ts-ignore
    jsonSchema,
    args.name || "Schema",
    { bannerComment: "" }
  );
  return tsInterface;
};
