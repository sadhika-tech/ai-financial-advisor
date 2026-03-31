import axios from "axios";

const BASE = "https://ai-financial-advisor-production-b3fc.up.railway.app";

const api = axios.create({ baseURL: BASE });

export const uploadCSV      = (file)    => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload", form);
};

export const getSummary     = (months)  => api.get(`/summary?months=${months}`);
export const getCategories  = (cat)     => api.get(`/categories${cat ? `?category=${encodeURIComponent(cat)}` : ""}`);
export const getForecast    = (cat)     => api.get(`/forecast${cat ? `?category=${encodeURIComponent(cat)}` : ""}`);
export const getCluster     = ()        => api.get("/cluster");
export const getBudgetPlan  = (months)  => api.get(`/budget-plan?months=${months}`);
export const getAnomalies   = ()        => api.get("/anomalies");
export const getHealth      = ()        => api.get("/health");