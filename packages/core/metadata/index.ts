export type MetadataMap = { [key: string]: MetadataValue };
export type MetadataValue = any;

export { Field, fieldTypes } from './fields';
export type { FieldMap, FieldType } from './fields';
export { String, Int, UInt, UInt64, Fix64, UFix64, Bool, IPFSImage, HTTPFile, IPFSFile } from './fields';
export { Schema, createSchema, parseSchema, defaultSchema } from './schema';
export type { SchemaInput } from './schema';
export { hashMetadata, hashMetadataWithSalt } from './hash';
export { validateMetadata } from './validate';

export {
  View,
  DisplayView,
  ExternalURLView,
  NFTCollectionDisplayView,
  NFTCollectionDataView,
  RoyaltiesView,
  NFTView,
  MediaView,
  SerialView,
} from './views';
