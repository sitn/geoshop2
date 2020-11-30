export class GeoshopUtils {

  /**
   * Try to get the id from an url
   * The id is located in the end
   */
  public static ExtractIdFromUrl(url?: string): number {
    let id = -1;

    try {
      if (url) {
        if (url.endsWith('/')) {
          url = url.substr(0, url.length - 1);
        }
        const temp = url.split('/');
        id = parseInt(temp[temp.length - 1], 10);
      }
    } catch {
      id = -1;
    }
    return id;
  }
}
