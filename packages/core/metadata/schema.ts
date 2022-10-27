import { Field, FieldMap, FieldInput, String, IPFSFile, parseFields, FieldTypes, FieldType } from './fields';
import { View, ViewInput, DisplayView, RoyaltiesView, parseViews } from './views';

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

  public static create(params: SchemaParameters): Schema {
    if (isFullSchemaParameters(params)) {
      const fieldMap = Schema.prepareFields(params.fields);
      const views = Schema.prepareViews(fieldMap, params.views ?? []);
      return new Schema(fieldMap, views);
    }

    const fieldMap = Schema.prepareFields(params);

    return new Schema(fieldMap, []);
  }

  public static parse(input: SchemaInput): Schema {
    if (Array.isArray(input)) {
      return createSchema({ fields: parseFields(input) });
    }

    const fields = parseFields(input.fields);

    const fieldMap = Schema.prepareFields(fields);
    const views = parseViews(input.views ?? [], fieldMap);

    return new Schema(fieldMap, views);
  }

  private constructor(fieldMap: FieldMap, views: View[]) {
    this.#fieldMap = fieldMap;
    this.views = views;
  }

  private static prepareFields(fieldTypes: FieldTypes): FieldMap {
    const fieldMap: { [name: string]: Field } = {};

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

  includesFieldType(fieldType: FieldType): boolean {
    const fieldTypes = this.fields.map((field) => field.type);
    return fieldTypes.includes(fieldType);
  }

  // TODO: include options in extend
  extend(schema: Schema | FieldTypes) {
    let fieldMap: FieldMap;
    let views: View[];

    if (schema instanceof Schema) {
      fieldMap = schema.getFieldsByName();
      views = schema.views;
    } else {
      fieldMap = Schema.prepareFields(schema);
      views = [];
    }

    const newFieldMap = Object.assign({}, this.#fieldMap, fieldMap);
    const newViews = this.views.concat(views);

    return new Schema(newFieldMap, newViews);
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
  return Schema.parse(input);
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
    RoyaltiesView(),
  ],
});
