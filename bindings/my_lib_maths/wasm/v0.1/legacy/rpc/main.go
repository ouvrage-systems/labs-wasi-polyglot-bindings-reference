package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
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

func main() {
	dec := json.NewDecoder(os.Stdin)
	for {
		var req rpcRequest
		if err := dec.Decode(&req); err != nil {
			if err == io.EOF {
				break
			}
			sendError(err.Error(), nil)
			continue
		}

		res, err := handleMethod(req.Method, req.Params)
		if err != nil {
			sendError(err.Error(), req.ID)
			continue
		}

		sendResult(res, req.ID)
	}
}

func handleMethod(method string, params json.RawMessage) (any, error) {
	switch method {
	case "maths.add":
		var args struct {
			A int64 `json:"a"`
			B int64 `json:"b"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return maths.Add(args.A, args.B), nil

	case "maths.computeSequence":
		var args struct {
			U0 int64 `json:"u0"`
			B  int64 `json:"b"`
			N  int64 `json:"n"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return maths.ComputeSequence(args.U0, args.B, args.N), nil

	case "maths.findLastPrime":
		var args struct {
			Limit int64 `json:"limit"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return maths.FindLastPrime(args.Limit), nil

	case "maths.concurrentCountPrimes":
		var args struct {
			Limit   int64 `json:"limit"`
			Workers int   `json:"workers"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return maths.ConcurrentCountPrimes(args.Limit, args.Workers), nil

	case "maths.fibonacci":
		var args struct {
			N int64 `json:"n"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return maths.Fibonacci(args.N), nil

	case "maths.fibonacciRecursive":
		var args struct {
			N int64 `json:"n"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return maths.FibonacciRecursive(args.N), nil

	default:
		return nil, fmt.Errorf("method not found: %s", method)
	}
}

func sendResult(result any, id *int) {
	resp := rpcResponse{
		Result: result,
		ID:     id,
	}
	bytes, _ := json.Marshal(resp)
	fmt.Println(string(bytes))
}

func sendError(errMsg string, id *int) {
	resp := rpcResponse{
		Error: &errMsg,
		ID:    id,
	}
	bytes, _ := json.Marshal(resp)
	fmt.Println(string(bytes))
}
