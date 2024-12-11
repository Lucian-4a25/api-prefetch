import { createPrefetchApi, PrefetchFetchError } from './common'

// 默认超时时间
const DEFAULT_TIMEOUT = 20000
// 创建请求器
const service = axios.create({
    baseURL: '',
    timeout: DEFAULT_TIMEOUT, // 请求超时时间
    responseType: 'json',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    },
})

// 显示报错信息
export const showError = (error) => {
    if (isAxiosCancelError(error)) {
      return
    }
    let msg = ''
    if (typeof error === 'string') {
      msg = error
    } else if (isApiResponse(error)) {
      ({ msg } = error)
    } else if (axios.isAxiosError(error)) {
      const data = error.response?.data
      if (isApiResponse(data)) {
        ({ msg } = data)
      } else if (isTimeoutError(error)) {
        msg = t('axios.timeoutError')
      } else {
        msg = error.message
      }
    } else if (error instanceof PrefetchFetchError) {
        // 如果是 prefetch 发起的请求错误，则从 PrefetchFetchError 中获取错误信息
        const { data } = error
        if (isApiResponse(data)) {
            ({ msg } = data)
        }
    } else if (error && error instanceof Error) {
      msg = error.message
    }
    // 这里调 destroy 有时候会失效，因为消息显示的过程是异步的，目前的解决方案是在入口文件中设置 maxCount: 1
    // message.destroy()
    message.error(msg || t('axios.serverError'))
}

// 非 2xx 状态入口
// 判断是取消的请求不要弹出错误提示
export function responseErrorInterceptor(error) {
    // 判断是取消的请求不要弹出错误提示
    if (isCanceled(error)) {
        return Promise.reject(error)
    }

    if (error.showError || (axios.isAxiosError(error) && error.config.showError)) {
        showError(error)
    }

    // 如果是 fetch 发起的请求错误
    if (error.isFetchError && error.config.showError) {
        showError(error)
    }

    return Promise.reject(error)
}

// 自定义成功请求拦截
export function responseSuccessInterceptor(res) {
    const { config, data: result } = res // 请求时携带的配置项

    if (config.withoutCheck) { // 不进行状态状态检测
        return result
    } else if (result.code === RESPONSE_CODE.SUCCESS || (config.mock && result.code === 0)) { // 接口正常调用
        return config.returnOrigin ? result : result.data // 是否返回原始数据
    } else if (isTokenInvalid(result)) { // token失效，登录过期
        /* eslint-disable no-restricted-globals */
        handleTokenInvalid()
        return Promise.reject(result.msg)
    } else { // 其他错误
        if (config.showError) {
            showError(result)
        }
        return Promise.reject(result)
    }
}

// 添加响应拦截器
service.interceptors.response.use(responseSuccessInterceptor, responseErrorInterceptor)

export const apiWrapper = {
    axios: service, // 原始 axios 对象
  
    get: (path, data, config) => requestFn('get', path, data, config),
    // 统一delete方法采用url传参
    delete: (path, data, config) => service.delete(path, {
      params: data,
      ...config
    }),
    post: (path, data, config) => requestFn('post', path, data, config),
    put: (path, data, config) => service.put(path, data, {
      ...customDefault,
      ...config
    })
}

// 接入预请求处理逻辑
export const api = createPrefetchApi(apiWrapper)
