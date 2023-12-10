import { z, ZodSchema } from "zod";

export function createZodSchema(zodText: string): z.ZodObject<any> | undefined {
  const schemaCode = `
const schema = ${zodText};
return schema;
    `.trim();

  // todo: not sure if this is safe?
  const createSchema = new Function("z", schemaCode);
  const schema = createSchema(z);

  if (!(schema instanceof z.ZodObject)) {
    console.log("Failed to convert text to zod schema");
    console.log(schemaCode);
    return undefined;
  }

  return schema;
}
