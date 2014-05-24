package org.firepick;

import org.json.simple.parser.*;
import org.json.simple.*;

public class JSONResult {
  Object value;

  protected JSONResult(Object value) {
    this.value = value;
  }

  public JSONResult(String json) throws FireRESTException {
    try {
      JSONParser parser = new JSONParser();
      value = (JSONObject) parser.parse(json);
    } catch (Exception e) {
      throw new FireRESTException("Could not parse: " + json, e);
    }
  }

  public JSONResult get(int index) {
    JSONArray array = (JSONArray) value;
    Object result = array.get(index);
    return new JSONResult(result);
  }

  public JSONResult get(String key) {
    JSONObject obj = (JSONObject) value;
    Object result = obj.get(key);
    return new JSONResult(result);
  }

  private void throwExpected(String msg) {
    if (value instanceof JSONArray) {
      throw new FireRESTException(msg + ((JSONArray) value).toJSONString());
    }
    if (value instanceof JSONObject) {
      throw new FireRESTException(msg + ((JSONObject) value).toJSONString());
    }
    throw new FireRESTException(msg + value.toString());
  }

  public boolean isNull() {
    return value == null;
  }

  public int getInt() {
    if (value instanceof Number) {
      return ((Number) value).intValue();
    }
    if (value instanceof String) {
      String s = (String) value;
      return Integer.parseInt(s);
    }
    throwExpected("Expected integer:");
    return 0; // never happens
  }

  public double getDouble() {
    if (value instanceof Number) {
      return ((Number) value).doubleValue();
    }
    if (value instanceof String) {
      String s = (String) value;
      return Double.parseDouble(s);
    }
    throwExpected("Expected number:");
    return 0; // never happens
  }

  public String getString() {
    if (value instanceof String || value instanceof Number) {
      return value.toString();
    }
    throwExpected("Expected string or number:");
    return "never happens";
  }

  public JSONObject getJSONObject() {
    return (JSONObject) value;
  }
}
