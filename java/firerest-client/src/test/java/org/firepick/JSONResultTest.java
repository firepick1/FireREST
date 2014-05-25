package org.firepick;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

// The following imports are required to run test content
import java.util.Scanner;
import java.io.File;
import java.net.URL;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.Charsets;

public class JSONResultTest 
    extends TestCase
{
  /**
   * Create the test case
   *
   * @param testName name of the test case
   */
  public JSONResultTest( String testName ) {
    super( testName );
  }

  /**
   * @return the suite of tests being tested
   */
  public static Test suite() {
    return new TestSuite( JSONResultTest.class );
  }

  public void testCalcOffset_model() throws Exception {
    String json = new Scanner(new File("src/test/resources/calcOffset-model.json")).useDelimiter("\\Z").next();
    JSONResult result = new JSONResult(json);
    JSONResult stage = result.get("calcOffset-stage");
    JSONResult channel = stage.get("channels").get("0");
    assertEquals(14, channel.get("dx").getInt());
    assertEquals(0, channel.get("dy").getInt());
    assertEquals("0.978238", channel.get("match").getString());
    assertEquals(0.978238d, channel.get("match").getDouble(), 0);

    assertEquals(400, stage.get("rects").get(0).get("x").getInt());
    assertEquals(736, stage.get("rects").get(1).get("width").getInt());
  }

  public void testCalcOffset_notfound() throws Exception {
    String json = new Scanner(new File("src/test/resources/calcOffset-notfound.json")).useDelimiter("\\Z").next();
    JSONResult result = new JSONResult(json);
    JSONResult channel = result.get("calcOffset-stage").get("channels").get("0");
    assertTrue(channel.isNull());
  }

  public void testProcessJson() throws Exception {
    URL processUrl = new URL("http://localhost:8001/firerest/cv/1/gray/cve/calc-offset/process.json");
    JSONResult result;
    try {
      String json = IOUtils.toString(processUrl, Charsets.UTF_8);
      result = new JSONResult(json);
    } catch (Exception e) {
      StringBuilder msg = new StringBuilder();
      msg.append("\n");
      msg.append("-----------------------ERROR------------------------\n");
      msg.append("| testProcessJSON() requires FireREST server.      |\n");
      msg.append("| Launch the localhost server:                     |\n");
      msg.append("|   node server/firerest.js                        |\n");
      msg.append("----------------------------------------------------\n");
      System.out.println(msg);
      throw new FireRESTException(msg.toString(), e);
    }
    JSONResult stage = result.get("model");
    JSONResult channel = stage.get("channels").get("0");
    assertEquals(0, channel.get("dx").getInt());
    assertEquals(0, channel.get("dy").getInt());
    assertEquals("0.997476", channel.get("match").getString());
    assertEquals(0.997476d, channel.get("match").getDouble(), 0);

    assertEquals(400, stage.get("rects").get(0).get("x").getInt());
    assertEquals(164, stage.get("rects").get(1).get("width").getInt());
  }

}
