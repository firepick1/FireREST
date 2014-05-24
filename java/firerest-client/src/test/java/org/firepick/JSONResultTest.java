package org.firepick;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;
import java.util.Scanner;
import java.io.*;

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

}
