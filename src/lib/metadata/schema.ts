import { Field, Fields, FieldInput, String, IPFSImage, parseFields } from './fields';
import { DisplayView, View } from './views';

type ViewFunc = (fields: Fields) => View;

type SchemaParameters = SimpleSchemaParameters | AdvancedSchemaParameters;
type SimpleSchemaParameters = Fields;
type AdvancedSchemaParameters = { fields: Fields; views?: View[] | ViewFunc[] };

function isAdvancedSchemaParameters(params: SchemaParameters): params is AdvancedSchemaParameters {
  return (params as AdvancedSchemaParameters).fields !== undefined;
}

export class Schema {
  fields: Fields;
  views: View[];

  constructor(params: SchemaParameters) {
    if (isAdvancedSchemaParameters(params)) {
      this.fields = Schema.prepareFields(params.fields);
      this.views = Schema.prepareViews(params.fields, params.views ?? []);
    } else {
      this.fields = Schema.prepareFields(params);
      this.views = [];
    }
  }

  private static prepareFields(fields: Fields): Fields {
    // Set the name of all fields.
    for (const name in fields) {
      fields[name].setName(name);
    }

    return fields;
  }

  getFieldList(): Field[] {
    return Object.values(this.fields);
  }

  private static prepareViews(fields: Fields, views: View[] | ViewFunc[]): View[] {
    return views.map((view: View | ViewFunc) => {
      if (typeof view === 'function') {
        return view(fields);
      }

      return view;
    });
  }

  // TODO: include options in extend
  extend(schema: Schema | Fields) {
    let fields;

    if (schema instanceof Schema) {
      fields = schema.fields;
    } else {
      fields = schema;
    }

    const newFields = Object.assign({}, this.fields, fields);

    return new Schema({ fields: newFields, views: this.views });
  }

  getView(name: string): View | undefined {
    return this.views.find((view: View) => view.name === name);
  }
}

export function createSchema(params: SchemaParameters): Schema {
  return new Schema(params);
}

type SchemaInput = { fields: FieldInput[] } | FieldInput[];

export function parseSchema(input: SchemaInput): Schema {
  if (Array.isArray(input)) {
    return createSchema({ fields: parseFields(input) });
  }

  return createSchema({ fields: parseFields(input.fields) });
}

export const defaultSchema = createSchema({
  fields: {
    name: String(),
    description: String(),
    thumbnail: IPFSImage(),
  },
  views: [
    (fields: Fields) =>
      DisplayView({
        name: fields.name,
        description: fields.description,
        thumbnail: fields.thumbnail,
      }),
  ],
});
