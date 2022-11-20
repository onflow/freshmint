import * as metadata from '@freshmint/core/metadata';

export interface PreparedEntry {
  rawMetadata: metadata.MetadataMap;
  preparedMetadata: metadata.MetadataMap;
  hash: string;
}

export interface FieldProcessor {
  fieldType: metadata.FieldType;
  prepare(value: any): Promise<any>;
  process(rawValues: string[], preparedValues: string[]): Promise<void>;
}

export class MetadataProcessor {
  #schema: metadata.Schema;
  #fieldProcessors: FieldProcessor[];

  constructor(schema: metadata.Schema) {
    this.#schema = schema;
    this.#fieldProcessors = [];
  }

  addFieldProcessor(fieldProcessor: FieldProcessor) {
    this.#fieldProcessors.push(fieldProcessor);
  }

  async prepare(entries: metadata.MetadataMap[]): Promise<PreparedEntry[]> {
    return Promise.all(
      entries.map(async (rawMetadata: metadata.MetadataMap) => {
        const preparedMetadata = await this.#prepareMetadata(rawMetadata);
        const hash = metadata.hashMetadata(this.#schema, preparedMetadata).toString('hex');

        return {
          rawMetadata,
          preparedMetadata,
          hash,
        };
      }),
    );
  }

  async #prepareMetadata(entry: metadata.MetadataMap): Promise<metadata.MetadataMap> {
    const metadata: metadata.MetadataMap = {};

    for (const field of this.#schema.fields) {
      const rawValue = entry[field.name];

      metadata[field.name] = await this.#prepareField(field, rawValue);
    }

    return metadata;
  }

  async #prepareField(field: metadata.Field, value: any) {
    for (const fieldProcessor of this.#fieldProcessors) {
      if (field.type === fieldProcessor.fieldType) {
        return fieldProcessor.prepare(value);
      }
    }

    return value;
  }

  async process(entries: PreparedEntry[]): Promise<void> {
    for (const field of this.#schema.fields) {
      const rawValues = entries.map((entry) => entry.rawMetadata[field.name]);
      const preparedValues = entries.map((entry) => entry.preparedMetadata[field.name]);

      for (const fieldProcessor of this.#fieldProcessors) {
        if (field.type === fieldProcessor.fieldType) {
          await fieldProcessor.process(rawValues, preparedValues);
        }
      }
    }
  }
}
