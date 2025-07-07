# backend/app/core/logging_config.py

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from datetime import datetime
import json

def setup_logging():
    """Configure application logging"""
    
    # Get log level from environment
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv("LOG_FORMAT", "text")  # json or text
    
    # Create logs directory if it doesn't exist
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatters
    if log_format.lower() == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, "error.log"),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    return logger

class JsonFormatter(logging.Formatter):
    """JSON log formatter"""
    
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename',
                          'module', 'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'message', 'exc_info',
                          'exc_text', 'stack_info']:
                log_entry[key] = value
        
        return json.dumps(log_entry)

# Security logging
def log_security_event(event_type: str, user_id: str = None, details: dict = None):
    """Log security-related events"""
    security_logger = logging.getLogger("security")
    
    log_data = {
        "event_type": event_type,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "details": details or {}
    }
    
    security_logger.warning(f"Security event: {json.dumps(log_data)}")

# Usage examples:
# log_security_event("login_failed", user_id="user@email.com", details={"ip": "1.2.3.4"})
# log_security_event("rate_limit_exceeded", details={"endpoint": "/api/chat", "ip": "1.2.3.4"})
