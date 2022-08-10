import { registerHelper, registerPartial } from '../generators/TemplateGenerator';
import { Field } from './fields';

export class View {
  type: ViewType<any>
  options: any;

  id: string;
  cadenceTypeString: string;

  constructor(type: ViewType<any>, options: any) {
    this.type = type;
    this.options = options;

    this.id = type.id;
    this.cadenceTypeString = type.cadenceTypeString;
  }
}

export interface ViewType<ViewOptions> {
  (options: ViewOptions): View;
  id: string;
  cadenceTypeString: string;
};

export function defineView<ViewOptions>({
  id,
  cadenceTypeString,
  cadenceTemplatePath
}: {
  id: string;
  cadenceTypeString: string;
  cadenceTemplatePath: string;
}): ViewType<ViewOptions> {
  const viewType = (options: ViewOptions): View => {
    return new View(viewType, options);
  };

  viewType.id = id;
  viewType.cadenceTypeString = cadenceTypeString;

  registerPartial(id, cadenceTemplatePath)

  return viewType;
}

registerHelper('viewField', function (value) {
  if (value instanceof Field) {
    return value.name;
  }

  return value;
});

export const DisplayView = defineView<{
  name: Field | string;
  description: Field | string;
  thumbnail: Field | string;
}>({ 
  id: 'display',
  cadenceTypeString: "Type<MetadataViews.Display>()",
  cadenceTemplatePath: '../templates/cadence/views/DisplayView.partial.cdc'
})

export const MediaView = defineView<{
  file: Field, mediaType: string
}>({ 
  id: 'media',
  cadenceTypeString: "Type<MetadataViews.Media>()",
  cadenceTemplatePath: '../templates/cadence/views/MediaView.partial.cdc'
})

export const viewsTypes: ViewType<any>[] = [DisplayView, MediaView];

const viewsTypesById: { [key: string]: ViewType<any> } = viewsTypes.reduce(
  (views, view) => ({ [view.id]: view, ...views }),
  {},
);

function getViewTypeById(id: string): ViewType<any> {
  return viewsTypesById[id];
}

export type ViewInput = { type: string, options: any };

export function parseViews(views: ViewInput[]): View[] {
  return views.map((view: ViewInput) => {
    const viewType = getViewTypeById(view.type);
    return viewType(view.options);
  })
}
