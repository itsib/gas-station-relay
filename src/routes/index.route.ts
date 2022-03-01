import express, { Router } from 'express';
import { resolve } from 'path';
import { Route } from '../types';

export class IndexRoute implements Route {
  public readonly path = '/';
  public readonly router = Router();

  constructor() {
    this.router.use(`${this.path}`, express.static(resolve(`${__dirname}/../public`)));
  }
}
