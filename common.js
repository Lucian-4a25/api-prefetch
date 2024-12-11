import { responseErrorInterceptor, responseSuccessInterceptor } from './axios'

/* eslint-disable no-underscore-dangle */
export const getCacheKey = (method, url) => `${method.toUpperCase()}_${url}`

export const getParamsCacheKey = (method, url) => `prefetch_param_${getCacheKey(method, url)}`

export const API_PREFIX_PATH = '/api'

export const saveParamsToLocalStorage = (url, method, params) => {
  localStorage.setItem(getParamsCacheKey(method, url), JSON.stringify(params))
}

// 接口参数使用策略：
// 如果 cacheLastParameters 为 true, 则直接使用缓存的参数发起请求，如果为 false，如果存在 defaultParams，则使用 defaultParams
export const getLocalStorageParams = (url, method, config) => {
  const paramCacheKey = getParamsCacheKey(method, url)
  if (config.cacheLastParameters) {
    const storedParams = localStorage.getItem(paramCacheKey)
    return storedParams ? JSON.parse(storedParams) : null
  }
  if (config.defaultParams) {
    return config.defaultParams
  }
}

export const setPrefetchRequest = (method, url, req) => {
  if (!window.__PRELOADED_REQUEST__) {
    window.__PRELOADED_REQUEST__ = {}
  }
  window.__PRELOADED_REQUEST__[getCacheKey(method, url)] = req
}

export const getPrefetchRequest = (method, url) => {
  return window.__PRELOADED_REQUEST__ && window.__PRELOADED_REQUEST__[getCacheKey(method, url)]
}

export const clearPrefetchRequest = (method, url) => {
  if (window.__PRELOADED_REQUEST__ && window.__PRELOADED_REQUEST__[getCacheKey(method, url)]) {
    delete window.__PRELOADED_REQUEST__[getCacheKey(method, url)]
  }
}

export class PrefetchFetchError extends Error {
  constructor(message, response, data, config) {
    super(message)
    this.name = 'FetchError'
    this.response = response
    this.data = data
    this.config = config
    this.status = response ? response.status : null
    this.statusText = response ? response.statusText : ''
    this.isFetchError = true
  }
}

export function createPrefetchApi(apiInstance) {
  const res = {
    ...apiInstance
  }

  const prefetchedMethods = ['get', 'post']
  // 只允许 prefetch get post 请求
  prefetchedMethods.forEach(method => {
    res[method] = (path, data, ...args) => {
      const apiConfig = API_CONFIG[path]
      if (apiConfig && apiConfig.method === method.toUpperCase() && apiConfig.prefetch) {
        // 保存请求参数到 localStorage
        if (data && apiConfig.cacheLastParameters) {
          saveParamsToLocalStorage(path, method, data)
        }

        const prefetchRequest = getPrefetchRequest(method, path)
        if (prefetchRequest) {
          // console.log('preloadData used: ', path)
          let issuedRawRequest = false
          clearPrefetchRequest(method, path)
          // 处理预请求结果
          return prefetchRequest
            .then(response => {
              // 状态码为 2xx
              if (response.ok) {
                return response
                  .json()
                  .then(d => {
                  // 返回统一的格式方便接口调用处使用
                    return {
                      data: d,
                      config: apiConfig
                    }
                  })
                  .catch(_err => {
                    // console.error('解析结果失败: ', _err)
                    // 解析失败，发起原始请求
                    issuedRawRequest = true
                    return apiInstance[method](path, data, ...args)
                  })
              }

              // 如果结果错误，判断是否使用原始请求发起
              if (apiConfig.retryWhenError) {
                issuedRawRequest = true
                return apiInstance[method](path, data, ...args)
              }

              // 封装错误结果方便拦截器统一处理，如果返回的数据为 json，则转为 json 后处理
              return response
                .json()
                .then(errRes => {
                  throw new PrefetchFetchError(
                    `HTTP error! status: ${response.status}`,
                    response,
                    errRes,
                    apiConfig
                  )
                })
                .catch(_err => {
                  // 尝试以文本的形式解析 body 内容
                  return response.text()
                })
                .then(errTxt => {
                  throw new Error(errTxt)
                })
                .catch(_ => {
                  // 返回一个普通的 Error 对象
                  return new Error(`HTTP error! status: ${response.status}`)
                })
            })
            // 如果是原始请求，则不需要重复调用 axios response 拦截器的逻辑
            .then(r => {
              if (issuedRawRequest) {
                return r
              }
              return responseSuccessInterceptor(r)
            }, e => {
              if (issuedRawRequest) {
                return Promise.reject(e)
              }
              return responseErrorInterceptor(e)
            })
        }
      }

      // 发起原始请求
      return apiInstance[method](path, data, ...args)
    }
  })

  return res
}

const COMMON_API = ['/account/info']

export const ROUTE_API_MAP = {
  '/card': [
    ...COMMON_API,
    '/card/list',
    /* '/transaction/list' */
  ],
  // 添加更多路由映射...
}

const defaultConfig = {
  prefetch: true,
  cacheLastParameters: false,
  withoutCheck: false,
  returnOrigin: false,
  showError: false,
  retryWhenError: true,
}

/** 配置项说明：
 *
 * method: 请求的方法
 * prefetch: 是否启用预请求 (默认 true)
 * cacheLastParameters: 自动保存最新发起的参数，如果参数为空，需设置 cacheLastParameters 为 false （默认为 false）
 * defaultParams: 默认请求参数 (默认请求发起参数，默认为空)
 * withoutCheck: 是否进行状态检测 （默认 false）
 * returnOrigin: 是否返回原始结果对象 （默认 false）
 * showError: 全局错误时，是否使用统一的报错方式 (默认 false)
 * retryWhenError: 预先请求发送错误时，是否在组件中继续发起原始请求 (默认 true)
 *
*/
export const API_CONFIG = {
  '/account/info': {
    ...defaultConfig,
    method: 'GET',
  },
  '/card/list': {
    ...defaultConfig,
    method: 'GET',
  },
  // '/transaction/list': {
  //   ...defaultConfig,
  //   method: 'POST',
  //   cacheLastParameters: true,
  // }
  // 添加更多 API 配置...
}
