package org.firepick;

import java.util.Scanner;
import java.io.File;
import java.net.URL;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.Charsets;

/**
 * FireREST Java client. Fluent API for traversing JSON responses from FireREST web services.
 */
public class FireREST {

  /**
   * Load json from given file resource.
   * This is a convenient equivalent to get() with a file URL.
   *
   * @return JSONResult 
   */
  public static JSONResult get(File file) {
    try {
      String json = new Scanner(file).useDelimiter("\\Z").next();
      return new JSONResult(json);
    } catch (Throwable e) {
      throw new FireRESTException(e);
    }
  }

  /**
   * HTTP GET json from given URL resource.
   *
   * @return JSONResult 
   */
  public static JSONResult get(URL url) {
    try {
      String json = IOUtils.toString(url, Charsets.UTF_8);
      return new JSONResult(json);
    } catch (Throwable e) {
      throw new FireRESTException(e);
    }
  }

}
