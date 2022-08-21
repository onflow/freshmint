import { Field, FieldMap, FieldInput, String, IPFSFile, parseFields, FieldTypes } from './fields';
import { View, ViewInput, DisplayView, parseViews } from './views';

type ViewsThunk = (fields: FieldMap) => View[];

type SchemaParameters = SimpleSchemaParameters | FullSchemaParameters;
type SimpleSchemaParameters = FieldTypes;
type FullSchemaParameters = { fields: FieldTypes; views?: View[] | ViewsThunk };

function isFullSchemaParameters(params: SchemaParameters): params is FullSchemaParameters {
  return (params as FullSchemaParameters).fields !== undefined;
}

export class Schema {
  #fieldMap: FieldMap;
  views: View[];

  public static create(params: SchemaParameters) {
    if (isFullSchemaParameters(params)) {
      const fieldMap = Schema.prepareFields(params.fields);
      const views = Schema.prepareViews(fieldMap, params.views ?? []);
      return new Schema(fieldMap, views);
    }

    const fieldMap = Schema.prepareFields(params);

    return new Schema(fieldMap, []);
  }

  private constructor(fieldMap: FieldMap, views: View[]) {
    this.#fieldMap = fieldMap;
    this.views = views;
  }

  private static prepareFields(fieldTypes: FieldTypes): FieldMap {
    const fieldMap = {};

    for (const name in fieldTypes) {
      const field = new Field(name, fieldTypes[name]);
      fieldMap[name] = field;
    }

    return fieldMap;
  }

  private static prepareViews(fieldMap: FieldMap, views: View[] | ViewsThunk): View[] {
    return Array.isArray(views) ? views : views(fieldMap);
  }

  get fields(): Field[] {
    return Object.values(this.#fieldMap);
  }

  getFieldsByName(): FieldMap {
    return this.#fieldMap;
  }

  // TODO: include options in extend
  extend(schema: Schema | FieldTypes) {
    let fieldMap: FieldMap;

    if (schema instanceof Schema) {
      fieldMap = schema.getFieldsByName();
    } else {
      fieldMap = Schema.prepareFields(schema);
    }

    const newFieldMap = Object.assign({}, this.#fieldMap, fieldMap);

    return new Schema(newFieldMap, this.views);
  }

  export(): SchemaInput {
    return {
      fields: this.fields.map((field) => field.export()),
      views: this.views.map((view) => view.export()),
    };
  }
}

export function createSchema(params: SchemaParameters): Schema {
  return Schema.create(params);
}

export type SchemaInput = { fields: FieldInput[]; views?: ViewInput[] } | FieldInput[];

export function parseSchema(input: SchemaInput): Schema {
  if (Array.isArray(input)) {
    return createSchema({ fields: parseFields(input) });
  }

  return createSchema({
    fields: parseFields(input.fields),
    views: input.views ? parseViews(input.views) : [],
  });
}

export const defaultSchema = createSchema({
  fields: {
    name: String(),
    description: String(),
    thumbnail: IPFSFile(),
  },
  views: (fields: FieldMap) => [
    DisplayView({
      name: fields.name,
      description: fields.description,
      thumbnail: fields.thumbnail,
    }),
  ],
});
