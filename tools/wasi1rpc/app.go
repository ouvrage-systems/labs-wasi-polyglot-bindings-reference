package wasi1rpc

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

type rpcRequest struct {
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
	ID     *int            `json:"id"`
}

type rpcResponse struct {
	Result any     `json:"result,omitempty"`
	Error  *string `json:"error,omitempty"`
	ID     *int    `json:"id"`
}

// App encapsulates the JSON-RPC system, the router, and the stream loop engine
type App struct {
	Router *Router
}

// NewApp instantiates a new Ouvrage WASI V1 Application Framework
func NewApp() *App {
	return &App{
		Router: NewRouter(),
	}
}

// Run boots the infinite stdin-to-stdout JSON-RPC event loop
func (a *App) Run() {
	dec := json.NewDecoder(os.Stdin)
	for {
		var req rpcRequest
		if err := dec.Decode(&req); err != nil {
			if err == io.EOF {
				break
			}
			a.sendError(err.Error(), nil)
			continue
		}

		res, err := a.Router.Handle(req.Method, req.Params)
		if err != nil {
			a.sendError(err.Error(), req.ID)
			continue
		}

		a.sendResult(res, req.ID)
	}
}

func (a *App) sendResult(result any, id *int) {
	resp := rpcResponse{
		Result: result,
		ID:     id,
	}
	bytes, _ := json.Marshal(resp)
	fmt.Println(string(bytes))
}

func (a *App) sendError(errMsg string, id *int) {
	resp := rpcResponse{
		Error: &errMsg,
		ID:    id,
	}
	bytes, _ := json.Marshal(resp)
	fmt.Println(string(bytes))
}
