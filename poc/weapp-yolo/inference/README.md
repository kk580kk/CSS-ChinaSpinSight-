# ONNX Runtime Web for WeChat Mini Program

## 文件说明

| 文件 | 大小 | 说明 |
|------|------|------|
| ort-wasm.js | ~500KB | WebAssembly JS 接口 |
| ort-wasm.wasm | ~4MB | WebAssembly 二进制 |

## 下载地址

https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.0/dist/

## 微信小程序使用

```javascript
// 动态加载
const ort = require('./inference/ort-wasm.js');
```

## 注意事项

1. wasm 文件需要放在分包中（超过 2MB）
2. 或使用 CDN 动态加载
3. 首次加载需要编译，有延迟
