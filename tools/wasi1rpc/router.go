package wasi1rpc

import (
	"encoding/json"
	"fmt"
)

// Handler defines the function type that handles a request parameters payload
type Handler func(params json.RawMessage) (any, error)

// Router handles registering and dispatching JSON-RPC methods
type Router struct {
	handlers map[string]Handler
}

// NewRouter instantiates a new RPC router
func NewRouter() *Router {
	return &Router{
		handlers: make(map[string]Handler),
	}
}

// Register maps a string method identifier to a handler function
func (r *Router) Register(method string, handler Handler) {
	r.handlers[method] = handler
}

// Handle dispatches the method call to the registered handler
func (r *Router) Handle(method string, params json.RawMessage) (any, error) {
	handler, ok := r.handlers[method]
	if !ok {
		return nil, fmt.Errorf("method not found: %s", method)
	}
	return handler(params)
}
