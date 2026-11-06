class CarMaintRouter:
    """
    Sends every model in the `carmaint` app to the separate `carmaint`
    database, and keeps it out of `default` migrations entirely — so this
    feature set never touches the existing kvh_gpstracker database.
    """
    route_app_labels = {'carmaint'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'carmaint'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'carmaint'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if obj1._meta.app_label in self.route_app_labels or obj2._meta.app_label in self.route_app_labels:
            return obj1._meta.app_label == obj2._meta.app_label
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.route_app_labels:
            return db == 'carmaint'
        if db == 'carmaint':
            return False
        return None
