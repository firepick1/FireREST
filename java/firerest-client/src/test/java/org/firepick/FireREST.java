package org.firepick;

import java.util.Scanner;
import java.io.File;
import java.net.URL;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.Charsets;

public class FireREST {

  public static JSONResult load(File file) {
    try {
      String json = new Scanner(file).useDelimiter("\\Z").next();
      return new JSONResult(json);
    } catch (Exception e) {
      throw new FireRESTException(e);
    }
  }

  public static JSONResult load(URL url) {
    try {
      String json = IOUtils.toString(url, Charsets.UTF_8);
      return new JSONResult(json);
    } catch (Exception e) {
      throw new FireRESTException(e);
    }
  }

}
