package org.firepick;

import org.json.simple.parser.*;
import org.json.simple.*;

/**
 * Fluent wrapper for JSON result returned by FireREST
 */
public class JSONResult {
  Object value;

  protected JSONResult(Object value) {
    this.value = value;
  }

  /**
   * Parse given JSON string and set current JSON value
   */
  public JSONResult(String json) {
    try {
      JSONParser parser = new JSONParser();
      value = (JSONObject) parser.parse(json);
    } catch (Exception e) {
      throw new FireRESTException("Could not parse: " + json, e);
    }
  }

  /**
   * Advance current JSON value to specified element in JSON array.
   * Set current JSON value to null otherwise.
   * 
   * @param index zero-based JSON array index
   * @return JSONResult for fluent method chaining
   */
  public JSONResult get(int index) {
    if (value instanceof JSONArray) {
      JSONArray array = (JSONArray) value;
      Object result = array.get(index);
      return new JSONResult(result);
    }
    return new JSONResult(null);
  }

  /**
   * Advance current JSON value to specified value of current JSON object.
   * Set current JSON value to null otherwise.
   * 
   * @param key element key
   * @return JSONResult for fluent method chaining
   */
  public JSONResult get(String key) {
    if (value instanceof JSONObject) {
      JSONObject obj = (JSONObject) value;
      Object result = obj.get(key);
      return new JSONResult(result);
    }
    return new JSONResult(null);
  }

  private void throwExpected(String msg) {
    if (value instanceof JSONArray) {
      throw new FireRESTException(msg + ((JSONArray) value).toJSONString());
    }
    if (value instanceof JSONObject) {
      throw new FireRESTException(msg + ((JSONObject) value).toJSONString());
    }
    if (value == null) {
      throw new FireRESTException(msg + "null");
    }
    throw new FireRESTException(msg + value.toString());
  }

  /**
   * Return false if current element exists
   */
  public boolean isNull() {
    return value == null;
  }

  /**
   * Return an integer for current JSON value, parsing string values as required.
   */
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

  /**
   * Return a double number for current JSON value, parsing string values as required.
   */
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

  /**
   * Return string value for current JSON value
   */
  public String getString() {
    if (value instanceof String || value instanceof Number) {
      return value.toString();
    }
    throwExpected("Expected string or number:");
    return "never happens";
  }

}
