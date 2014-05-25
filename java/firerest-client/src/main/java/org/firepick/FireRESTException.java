package org.firepick;

/**
 * Unchecked exception wrapper for FireREST
 */
public class FireRESTException extends RuntimeException {
  public FireRESTException(Throwable e) {
    super(e);
  }

  public FireRESTException(String msg) {
    super(msg);
  }
 
  public FireRESTException(String msg, Throwable e) {
    super(msg, e);
  }
}
