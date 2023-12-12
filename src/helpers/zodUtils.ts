import { z } from "zod";

/**
 * Takes a string of zod code and returns a zod schema.
 */
export function createZodSchema(zodText: string): z.ZodObject<any> | undefined {
  const schemaCode = `
const schema = ${zodText};
return schema;
    `.trim();
  try {
    // todo: not sure if this is safe?
    const createSchema = new Function("z", schemaCode);
    const schema = createSchema(z);

    if (!(schema instanceof z.ZodObject)) {
      console.log("Failed to convert text to a valid zod object schema");
      console.log(schemaCode);
      return undefined;
    }

    return schema;
  } catch (e) {
    console.log("Failed to convert text to zod object schema");
    console.log(e);
    console.log(schemaCode);
    return undefined;
  }
}
