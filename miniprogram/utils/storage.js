// ChinaSpinSight Local Storage Utility
// 本地存储工具类 - 历史记录、缓存、视频临时文件

const STORAGE_KEYS = {
  HISTORY: 'chinaspinsight_history',      // 检测历史记录
  USER_INFO: 'chinaspinsight_user',       // 用户信息（可选）
  SETTINGS: 'chinaspinsight_settings',    // 用户设置
  MODEL_READY: 'chinaspinsight_model',    // 模型加载状态
  VIDEO_CACHE: 'chinaspinsight_video_cache' // 视频缓存
};

const MAX_HISTORY_COUNT = 100;  // 最大历史记录数
const MAX_CACHE_SIZE = 100 * 1024 * 1024;  // 100MB 缓存上限

/**
 * 历史记录管理
 */
export const HistoryStorage = {
  /**
   * 获取所有历史记录
   */
  getAll() {
    try {
      const data = wx.getStorageSync(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get history:', e);
      return [];
    }
  },

  /**
   * 保存历史记录
   */
  save(record) {
    try {
      const history = this.getAll();
      
      // 添加新记录（放在最前面）
      const newRecord = {
        id: record.id || this.generateId(),
        spin_rounds: record.spin_rounds,
        confidence: record.confidence,
        duration: record.duration,
        spin_level: record.spin_level || this.calcSpinLevel(record.spin_rounds),
        created_at: record.created_at || new Date().toISOString(),
        thumbnail: record.thumbnail || null
      };
      
      history.unshift(newRecord);
      
      // 限制数量
      const trimmed = history.slice(0, MAX_HISTORY_COUNT);
      
      wx.setStorageSync(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
      
      return newRecord;
    } catch (e) {
      console.error('Failed to save history:', e);
      return null;
    }
  },

  /**
   * 删除单条记录
   */
  delete(recordId) {
    try {
      const history = this.getAll();
      const filtered = history.filter(r => r.id !== recordId);
      wx.setStorageSync(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete history:', e);
      return false;
    }
  },

  /**
   * 清空所有历史记录
   */
  clear() {
    try {
      wx.removeStorageSync(STORAGE_KEYS.HISTORY);
      return true;
    } catch (e) {
      console.error('Failed to clear history:', e);
      return false;
    }
  },

  /**
   * 获取历史记录统计
   */
  getStats() {
    const history = this.getAll();
    if (history.length === 0) {
      return { total: 0, avgRounds: 0, maxRounds: 0 };
    }
    
    const total = history.length;
    const avgRounds = history.reduce((sum, r) => sum + (r.spin_rounds || 0), 0) / total;
    const maxRounds = Math.max(...history.map(r => r.spin_rounds || 0));
    
    return { total, avgRounds: avgRounds.toFixed(1), maxRounds };
  },

  /**
   * 计算旋转等级
   */
  calcSpinLevel(rounds) {
    if (rounds < 1) return '弱旋转';
    if (rounds < 3) return '中等旋转';
    if (rounds < 5) return '强旋转';
    return '极强旋转';
  },

  /**
   * 生成唯一 ID
   */
  generateId() {
    return 'rec_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
};

/**
 * 设置管理
 */
export const SettingsStorage = {
  /**
   * 获取设置
   */
  get() {
    try {
      const data = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : this.getDefault();
    } catch (e) {
      return this.getDefault();
    }
  },

  /**
   * 保存设置
   */
  set(settings) {
    try {
      const current = this.get();
      const merged = { ...current, ...settings };
      wx.setStorageSync(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  },

  /**
   * 获取默认设置
   */
  getDefault() {
    return {
      autoPlay: true,        // 自动播放引导视频
      videoQuality: 'high',  // high, medium, low
      detectionSensitivity: 0.5,  // 检测灵敏度
      soundEnabled: true,    // 声音开关
      hapticEnabled: true    // 震动反馈
    };
  },

  /**
   * 重置设置
   */
  reset() {
    wx.removeStorageSync(STORAGE_KEYS.SETTINGS);
    return this.getDefault();
  }
};

/**
 * 模型状态管理
 */
export const ModelStorage = {
  /**
   * 获取模型加载状态
   */
  getStatus() {
    try {
      const data = wx.getStorageSync(STORAGE_KEYS.MODEL_READY);
      return data ? JSON.parse(data) : { loaded: false, version: null };
    } catch (e) {
      return { loaded: false, version: null };
    }
  },

  /**
   * 保存模型加载状态
   */
  setStatus(status) {
    try {
      wx.setStorageSync(STORAGE_KEYS.MODEL_READY, JSON.stringify(status));
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * 检查模型是否需要更新
   */
  needsUpdate(newVersion) {
    const current = this.getStatus();
    return !current.loaded || current.version !== newVersion;
  }
};

/**
 * 视频缓存管理
 */
export const VideoCache = {
  /**
   * 获取缓存信息
   */
  getInfo() {
    try {
      const data = wx.getStorageSync(STORAGE_KEYS.VIDEO_CACHE);
      return data ? JSON.parse(data) : { videos: [], totalSize: 0 };
    } catch (e) {
      return { videos: [], totalSize: 0 };
    }
  },

  /**
   * 添加视频到缓存
   */
  add(videoPath, size) {
    try {
      const cache = this.getInfo();
      
      // 检查是否超过缓存上限
      if (cache.totalSize + size > MAX_CACHE_SIZE) {
        this.cleanup();
      }
      
      cache.videos.push({
        path: videoPath,
        size: size,
        addedAt: Date.now()
      });
      cache.totalSize += size;
      
      wx.setStorageSync(STORAGE_KEYS.VIDEO_CACHE, JSON.stringify(cache));
      return true;
    } catch (e) {
      console.error('Failed to add video to cache:', e);
      return false;
    }
  },

  /**
   * 清理旧缓存（保留最近 10 个）
   */
  cleanup() {
    try {
      const cache = this.getInfo();
      if (cache.videos.length <= 10) return;
      
      // 按添加时间排序，保留最近的
      const sorted = cache.videos.sort((a, b) => b.addedAt - a.addedAt);
      const kept = sorted.slice(0, 10);
      
      // 删除被移除的视频文件
      const removed = sorted.slice(10);
      removed.forEach(v => {
        try {
          wx.removeSavedFile({ filePath: v.path });
        } catch (e) {
          // 忽略删除失败
        }
      });
      
      // 更新缓存
      cache.videos = kept;
      cache.totalSize = kept.reduce((sum, v) => sum + v.size, 0);
      
      wx.setStorageSync(STORAGE_KEYS.VIDEO_CACHE, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to cleanup cache:', e);
    }
  },

  /**
   * 清空所有缓存
   */
  clear() {
    try {
      const cache = this.getInfo();
      cache.videos.forEach(v => {
        try {
          wx.removeSavedFile({ filePath: v.path });
        } catch (e) {}
      });
      wx.removeStorageSync(STORAGE_KEYS.VIDEO_CACHE);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * 用户信息存储（可选，用于简单的本地用户识别）
 */
export const UserStorage = {
  get() {
    try {
      const data = wx.getStorageSync(STORAGE_KEYS.USER_INFO);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  set(userInfo) {
    try {
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
      return true;
    } catch (e) {
      return false;
    }
  },

  clear() {
    try {
      wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// 默认导出
export default {
  HistoryStorage,
  SettingsStorage,
  ModelStorage,
  VideoCache,
  UserStorage,
  STORAGE_KEYS
};
