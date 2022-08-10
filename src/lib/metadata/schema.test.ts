import * as metadata from "./index";

describe('metadata.Schema', () => {

  it('can create a schema', () => {

    const schema = metadata.createSchema({
      fields: {
        name: metadata.String(),
        description: metadata.String(),
        thumbnail: metadata.String(),
        video: metadata.HTTPFile(),
      },
      views: (fields: metadata.Fields) => [
        metadata.DisplayView({
          name: fields.name,
          description: fields.description,
          thumbnail: fields.thumbnail,
        }),
        metadata.MediaView({
          file: fields.video,
          mediaType: 'video/mp4'
        })
      ],
    });

    
  })
});
